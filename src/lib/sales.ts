import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { InsufficientStockError } from "@/lib/errors";

export type SaleItemInput = {
  variantId: string;
  quantity: number;
};

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
 * Esta misma función es la que garantiza la sincronización de stock entre
 * la tienda online y el POS: ambos canales pasan por acá.
 */
export async function createPosSale(input: CreatePosSaleInput) {
  if (input.items.length === 0) {
    throw new Error("La venta no tiene productos.");
  }

  return prisma.$transaction(async (tx) => {
    const variants = await tx.productVariant.findMany({
      where: { id: { in: input.items.map((i) => i.variantId) } },
    });
    const variantById = new Map(variants.map((v) => [v.id, v]));

    let subtotal = new Prisma.Decimal(0);
    const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];

    for (const item of input.items) {
      const variant = variantById.get(item.variantId);
      if (!variant) throw new Error(`Variante no encontrada: ${item.variantId}`);

      // Descuento condicionado: solo resta si hay stock suficiente en esta
      // misma sentencia UPDATE, evitando condiciones de carrera entre
      // ventas simultáneas (dos cajeros vendiendo el último producto a la vez).
      const updated = await tx.stockItem.updateMany({
        where: {
          variantId: item.variantId,
          locationId: input.locationId,
          quantity: { gte: item.quantity },
        },
        data: { quantity: { decrement: item.quantity } },
      });

      if (updated.count === 0) {
        throw new InsufficientStockError(item.variantId, item.quantity);
      }

      const totalPrice = variant.price.mul(item.quantity);
      subtotal = subtotal.add(totalPrice);

      orderItemsData.push({
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: variant.price,
        totalPrice,
      });
    }

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
