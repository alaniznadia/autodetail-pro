import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decrementStock, priceOrderItems, type SaleItemInput } from "@/lib/stock";
import { claimCoupon } from "@/lib/coupons";
import { computeManualDiscountAmount, type ManualDiscountInput } from "@/lib/discount";
import { withIdempotency } from "@/lib/idempotency";
import { accruePointsForOrder } from "@/lib/loyalty";

export type { SaleItemInput };

export type CreatePosSaleInput = {
  locationId: string;
  soldById: string;
  items: SaleItemInput[];
  paymentMethod: "CASH" | "CARD" | "MERCADO_PAGO" | "TRANSFER";
  couponCode?: string;
  manualDiscount?: ManualDiscountInput;
  idempotencyKey?: string;
};

/**
 * Crea una venta de forma atómica: valida y descuenta stock, registra el
 * movimiento de stock, crea el pedido y su pago, todo en una única
 * transacción de base de datos. Si el stock de cualquier ítem no alcanza,
 * se aborta toda la operación (no se vende "a medias").
 *
 * Esta misma función (a través de lib/stock.ts) es la que garantiza la
 * sincronización de stock entre la tienda online y el POS: ambos canales
 * pasan por el mismo descuento atómico.
 */
export async function createPosSale(input: CreatePosSaleInput) {
  if (input.items.length === 0) {
    throw new Error("La venta no tiene productos.");
  }

  return withIdempotency(
    input.idempotencyKey,
    () =>
      input.idempotencyKey
        ? prisma.order.findUnique({
            where: { idempotencyKey: input.idempotencyKey },
            include: { items: true },
          })
        : Promise.resolve(null),
    () => createPosSaleTransaction(input)
  );
}

async function createPosSaleTransaction(input: CreatePosSaleInput) {
  return prisma.$transaction(async (tx) => {
    const { subtotal, orderItemsData } = await priceOrderItems(tx, input.items);
    await decrementStock(tx, input.locationId, input.items);

    let couponId: string | undefined;
    let discountTotal = new Prisma.Decimal(0);
    if (input.couponCode) {
      const claimed = await claimCoupon(tx, input.couponCode, subtotal);
      couponId = claimed.couponId;
      discountTotal = claimed.discountTotal;
    }
    if (input.manualDiscount) {
      discountTotal = discountTotal.add(computeManualDiscountAmount(subtotal, input.manualDiscount));
    }
    // Un cupón y un descuento manual pueden combinarse; nunca superan el subtotal.
    if (discountTotal.gt(subtotal)) discountTotal = subtotal;
    const total = subtotal.sub(discountTotal);

    const order = await tx.order.create({
      data: {
        channel: "POS",
        status: "PAID",
        fulfillmentMethod: "STORE_PICKUP",
        locationId: input.locationId,
        soldById: input.soldById,
        couponId,
        idempotencyKey: input.idempotencyKey,
        subtotal,
        discountTotal,
        total,
        items: { createMany: { data: orderItemsData } },
        payments: {
          create: {
            method: input.paymentMethod,
            status: "APPROVED",
            amount: total,
          },
        },
        statusHistory: { create: { status: "PAID", note: "Venta POS confirmada" } },
      },
      include: { items: true },
    });

    for (const item of input.items) {
      await tx.stockMovement.create({
        data: {
          variantId: item.variantId,
          locationId: input.locationId,
          type: "SALE_POS",
          quantity: -item.quantity,
          orderId: order.id,
          userId: input.soldById,
        },
      });
    }

    // La venta del POS nace pagada (no pasa por un cambio de estado que
    // dispare la acreditación): hoy no acredita nada porque el POS no
    // identifica al cliente, pero queda listo para cuando lo haga.
    await accruePointsForOrder(tx, order.id);

    return order;
  });
}
