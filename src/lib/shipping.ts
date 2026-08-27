import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SaleItemInput } from "@/lib/stock";

// Peso a asumir cuando una variante no tiene weightGr cargado, para no
// cotizar un envío en $0 por datos incompletos.
const DEFAULT_ITEM_WEIGHT_GR = 500;

/**
 * Calcula el costo de envío según el peso total del carrito, usando los
 * tramos configurados en ShippingRate (ver comentario en el schema:
 * placeholder honesto mientras no haya cuenta comercial con Correo
 * Argentino/Andreani). Si el peso supera todos los tramos cargados, se
 * cobra el tramo más caro en vez de fallar.
 */
export async function calculateShippingCost(items: SaleItemInput[]): Promise<Prisma.Decimal> {
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: items.map((i) => i.variantId) } },
    select: { id: true, weightGr: true },
  });
  const weightByVariant = new Map(variants.map((v) => [v.id, v.weightGr]));

  const totalWeightGr = items.reduce((sum, item) => {
    const weight = weightByVariant.get(item.variantId) ?? DEFAULT_ITEM_WEIGHT_GR;
    return sum + weight * item.quantity;
  }, 0);

  const rates = await prisma.shippingRate.findMany({
    where: { active: true },
    orderBy: { maxWeightGr: "asc" },
  });

  if (rates.length === 0) {
    throw new Error(
      "No hay tarifas de envío configuradas. Cargalas desde /admin/envios."
    );
  }

  const matchingRate = rates.find((rate) => totalWeightGr <= rate.maxWeightGr);
  return (matchingRate ?? rates[rates.length - 1]).cost;
}
