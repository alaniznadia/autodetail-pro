import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PurchaseItemInput = {
  variantId: string;
  quantity: number;
  unitCost: number;
};

export type CreatePurchaseOrderInput = {
  supplierId: string;
  locationId: string;
  createdById: string;
  notes?: string;
  items: PurchaseItemInput[];
  // Presentes cuando la compra se cargó importando un remito/ticket en vez
  // de a mano (ver /admin/compras/importar).
  sourceFileUrl?: string;
  sourceType?: string;
};

/**
 * Registra una compra a proveedor: crea la orden de compra, ingresa el
 * stock correspondiente en la sucursal, registra el movimiento de stock
 * (PURCHASE_IN) y actualiza el costo de cada variante al último costo
 * comprado (para que el margen y el stock valorizado reflejen el costo
 * real). Todo en una única transacción.
 */
export async function createPurchaseOrder(input: CreatePurchaseOrderInput) {
  if (input.items.length === 0) {
    throw new Error("La compra no tiene productos.");
  }

  return prisma.$transaction(async (tx) => {
    const purchaseOrder = await tx.purchaseOrder.create({
      data: {
        supplierId: input.supplierId,
        locationId: input.locationId,
        createdById: input.createdById,
        notes: input.notes,
        sourceFileUrl: input.sourceFileUrl,
        sourceType: input.sourceType,
        status: "RECEIVED",
        items: {
          createMany: {
            data: input.items.map((item) => ({
              variantId: item.variantId,
              quantity: item.quantity,
              unitCost: new Prisma.Decimal(item.unitCost),
            })),
          },
        },
      },
      include: { items: true },
    });

    for (const item of input.items) {
      await tx.stockItem.upsert({
        where: {
          variantId_locationId: { variantId: item.variantId, locationId: input.locationId },
        },
        update: { quantity: { increment: item.quantity } },
        create: {
          variantId: item.variantId,
          locationId: input.locationId,
          quantity: item.quantity,
        },
      });

      await tx.stockMovement.create({
        data: {
          variantId: item.variantId,
          locationId: input.locationId,
          type: "PURCHASE_IN",
          quantity: item.quantity,
          userId: input.createdById,
          reason: "Compra a proveedor",
        },
      });

      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { costPrice: new Prisma.Decimal(item.unitCost) },
      });
    }

    return purchaseOrder;
  });
}
