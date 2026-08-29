import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decrementStock, priceOrderItems, type SaleItemInput } from "@/lib/stock";
import { calculateShippingCost } from "@/lib/shipping";
import { claimCoupon } from "@/lib/coupons";
import { withIdempotency } from "@/lib/idempotency";
import { getStoreSettings, applyFreeShipping } from "@/lib/store-settings";
import { redeemPoints } from "@/lib/loyalty";

export type CreateOnlineOrderInput = {
  locationId: string;
  items: SaleItemInput[];
  fulfillmentMethod: "SHIPPING" | "STORE_PICKUP";
  paymentMethod: "CASH" | "TRANSFER" | "MERCADO_PAGO";
  customerId?: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  couponCode?: string;
  pointsToRedeem?: number;
  idempotencyKey?: string;
  shippingAddress?: {
    street: string;
    number: string;
    floorApt?: string;
    city: string;
    province: string;
    postalCode: string;
  };
};

/**
 * Crea un pedido online de forma atómica, con el mismo descuento de stock
 * condicionado que usa el POS (ver lib/stock.ts). El pedido queda en
 * estado PENDING: pasa a PAID cuando se confirme el pago (efectivo/
 * transferencia al retirar, o vía webhook de Mercado Pago una vez
 * integrado).
 */
export async function createOnlineOrder(input: CreateOnlineOrderInput) {
  if (input.items.length === 0) {
    throw new Error("El pedido no tiene productos.");
  }
  if (input.fulfillmentMethod === "SHIPPING" && !input.shippingAddress) {
    throw new Error("Falta la dirección de envío.");
  }

  const shippingCost =
    input.fulfillmentMethod === "SHIPPING"
      ? await calculateShippingCost(input.items)
      : new Prisma.Decimal(0);

  return withIdempotency(
    input.idempotencyKey,
    () =>
      input.idempotencyKey
        ? prisma.order.findUnique({
            where: { idempotencyKey: input.idempotencyKey },
            include: { items: true },
          })
        : Promise.resolve(null),
    () => createOnlineOrderTransaction(input, shippingCost)
  );
}

async function createOnlineOrderTransaction(
  input: CreateOnlineOrderInput,
  shippingCost: Prisma.Decimal
) {
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

    // El umbral de envío gratis se mide contra lo que el cliente paga en
    // productos (subtotal - descuento), no contra el subtotal bruto: si se
    // midiera contra el bruto, un cupón grande podría regalar el envío de
    // una compra chica. Ver lib/store-settings.ts.
    const netSubtotal = subtotal.sub(discountTotal);
    const settings = await getStoreSettings();
    const finalShippingCost = applyFreeShipping(shippingCost, netSubtotal, settings.freeShippingFrom);

    const total = netSubtotal.add(finalShippingCost);

    let addressId: string | undefined;
    if (input.fulfillmentMethod === "SHIPPING" && input.shippingAddress) {
      // Pedido de invitado: la dirección se guarda sin dueño fijo salvo
      // que haya un cliente logueado, para poder despachar el envío.
      const address = await tx.address.create({
        data: {
          ...input.shippingAddress,
          phone: input.guestPhone,
          userId: input.customerId,
        } as Prisma.AddressUncheckedCreateInput,
      });
      addressId = address.id;
    }

    const order = await tx.order.create({
      data: {
        channel: "ONLINE",
        status: "PENDING",
        fulfillmentMethod: input.fulfillmentMethod,
        locationId: input.locationId,
        customerId: input.customerId,
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        guestPhone: input.guestPhone,
        addressId,
        couponId,
        idempotencyKey: input.idempotencyKey,
        subtotal,
        discountTotal,
        shippingCost: finalShippingCost,
        total,
        shippingProvider: input.fulfillmentMethod === "SHIPPING" ? "tarifa_propia" : null,
        items: { createMany: { data: orderItemsData } },
        payments: {
          create: {
            method: input.paymentMethod,
            status: "PENDING",
            amount: total,
          },
        },
        statusHistory: { create: { status: "PENDING", note: "Pedido creado desde la tienda online" } },
      },
      include: { items: true },
    });

    for (const item of input.items) {
      await tx.stockMovement.create({
        data: {
          variantId: item.variantId,
          locationId: input.locationId,
          type: "SALE_ONLINE",
          quantity: -item.quantity,
          orderId: order.id,
        },
      });
    }

    // Canje de puntos: solo clientes logueados. Se resuelve después de
    // crear el pedido (la reserva de puntos queda asociada a su id), y el
    // descuento se aplica tanto al total del pedido como al pago pendiente
    // para que lo que se le cobra al cliente sea lo correcto.
    if (input.pointsToRedeem && input.customerId) {
      const pointsDiscount = await redeemPoints(
        tx,
        input.customerId,
        input.pointsToRedeem,
        order.id
      );
      if (pointsDiscount.gt(0)) {
        const finalTotal = order.total.sub(pointsDiscount);
        await tx.order.update({
          where: { id: order.id },
          data: { total: finalTotal, pointsRedeemed: input.pointsToRedeem },
        });
        await tx.payment.updateMany({
          where: { orderId: order.id },
          data: { amount: finalTotal },
        });
        order.total = finalTotal;
        order.pointsRedeemed = input.pointsToRedeem;
      }
    }

    return order;
  });
}
