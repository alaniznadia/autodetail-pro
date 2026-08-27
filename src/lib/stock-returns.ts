import { Prisma, OrderStatus } from "@prisma/client";

// Estados a partir de los cuales el pedido ya no representa una venta real:
// el stock que se había descontado al crearlo tiene que volver al
// inventario. Sin esto, cancelar o reembolsar un pedido deja el stock
// descontado para siempre.
export const RESTOCK_STATUSES: Set<OrderStatus> = new Set(["CANCELLED", "REFUNDED"]);

/**
 * Devuelve al stock los ítems de un pedido. Debe llamarse dentro de la
 * misma transacción que cambia el status del pedido, y solo cuando se
 * transiciona HACIA CANCELLED/REFUNDED desde un estado que todavía no
 * había devuelto stock (ver RESTOCK_STATUSES) — así una segunda
 * notificación de "cancelado" no duplica el ingreso.
 */
export async function restockOrderItems(
  tx: Prisma.TransactionClient,
  orderId: string,
  locationId: string,
  userId?: string
) {
  const items = await tx.orderItem.findMany({ where: { orderId } });

  for (const item of items) {
    await tx.stockItem.upsert({
      where: { variantId_locationId: { variantId: item.variantId, locationId } },
      update: { quantity: { increment: item.quantity } },
      create: { variantId: item.variantId, locationId, quantity: item.quantity },
    });

    await tx.stockMovement.create({
      data: {
        variantId: item.variantId,
        locationId,
        type: "RETURN_IN",
        quantity: item.quantity,
        orderId,
        userId,
        reason: "Cancelación o reembolso de pedido",
      },
    });
  }
}
