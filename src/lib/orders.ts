import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decrementStock, priceOrderItems, type SaleItemInput } from "@/lib/stock";

// Costo de envío fijo mientras no esté integrado el cotizador real de
// Correo Argentino / Andreani (ver README, sección "Próximos pasos").
const FLAT_SHIPPING_COST = new Prisma.Decimal(4500);

export type CreateOnlineOrderInput = {
  locationId: string;
  items: SaleItemInput[];
  fulfillmentMethod: "SHIPPING" | "STORE_PICKUP";
  paymentMethod: "CASH" | "TRANSFER" | "MERCADO_PAGO";
  customerId?: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
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

  return prisma.$transaction(async (tx) => {
    const { subtotal, orderItemsData } = await priceOrderItems(tx, input.items);
    await decrementStock(tx, input.locationId, input.items);

    const shippingCost =
      input.fulfillmentMethod === "SHIPPING" ? FLAT_SHIPPING_COST : new Prisma.Decimal(0);
    const total = subtotal.add(shippingCost);

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
        subtotal,
        shippingCost,
        total,
        shippingProvider: input.fulfillmentMethod === "SHIPPING" ? "a_coordinar" : null,
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

    return order;
  });
}
