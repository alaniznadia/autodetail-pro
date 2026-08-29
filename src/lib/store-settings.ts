import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Configuración transversal de la tienda (fila única "default"), mismo
 * patrón que getStoreTheme en lib/store-theme.ts: si la fila no existe
 * todavía, se devuelven los valores por defecto sin escribir nada.
 */

export type StoreSettingsValues = {
  freeShippingFrom: Prisma.Decimal | null;
  loyaltyEnabled: boolean;
  loyaltyArsPerPoint: number;
  loyaltyPointValue: Prisma.Decimal;
  loyaltyMinRedeem: number;
};

const DEFAULTS: StoreSettingsValues = {
  freeShippingFrom: null,
  loyaltyEnabled: false,
  loyaltyArsPerPoint: 1000,
  loyaltyPointValue: new Prisma.Decimal(35),
  loyaltyMinRedeem: 100,
};

export async function getStoreSettings(): Promise<StoreSettingsValues> {
  const row = await prisma.storeSettings.findUnique({ where: { id: "default" } });
  if (!row) return DEFAULTS;
  return {
    freeShippingFrom: row.freeShippingFrom,
    loyaltyEnabled: row.loyaltyEnabled,
    loyaltyArsPerPoint: row.loyaltyArsPerPoint,
    loyaltyPointValue: row.loyaltyPointValue,
    loyaltyMinRedeem: row.loyaltyMinRedeem,
  };
}

export async function updateStoreSettings(data: Partial<StoreSettingsValues>) {
  return prisma.storeSettings.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...DEFAULTS, ...data },
  });
}

/**
 * Aplica el umbral de envío gratis sobre un costo ya cotizado.
 *
 * Se llama DESPUÉS de conocer el descuento (dentro de la transacción que
 * crea el pedido), porque el umbral se mide contra lo que el cliente
 * efectivamente paga en productos: subtotal - descuento. Si se midiera
 * contra el subtotal bruto, un cupón grande podría regalar el envío de una
 * compra chica.
 */
export function applyFreeShipping(
  shippingCost: Prisma.Decimal,
  netSubtotal: Prisma.Decimal,
  freeShippingFrom: Prisma.Decimal | null
): Prisma.Decimal {
  if (!freeShippingFrom) return shippingCost;
  return netSubtotal.gte(freeShippingFrom) ? new Prisma.Decimal(0) : shippingCost;
}
