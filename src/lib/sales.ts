import { prisma } from "@/lib/prisma";
import { decrementStock, priceOrderItems, type SaleItemInput } from "@/lib/stock";

export type { SaleItemInput };

export type CreatePosSaleInput = {
  locationId: string;
  soldById: string;
  items: SaleItemInput[];
  paymentMethod: "CASH" | "CARD" | "MERCADO_PAGO" | "TRANSFER";
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

  return prisma.$transaction(async (tx) => {
    const { subtotal, orderItemsData } = await priceOrderItems(tx, input.items);
    await decrementStock(tx, input.locationId, input.items);

    const order = await tx.order.create({
      data: {
        channel: "POS",
        status: "PAID",
        fulfillmentMethod: "STORE_PICKUP",
        locationId: input.locationId,
        soldById: input.soldById,
        subtotal,
        total: subtotal,
        items: { createMany: { data: orderItemsData } },
        payments: {
          create: {
            method: input.paymentMethod,
            status: "APPROVED",
            amount: subtotal,
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

    return order;
  });
}
