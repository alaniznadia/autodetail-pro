import { prisma } from "@/lib/prisma";

/**
 * Set de productIds favoritos del usuario, para marcar el corazón en una
 * grilla de productos sin hacer una consulta por tarjeta. Vacío si no hay
 * sesión o no hay productos que consultar.
 */
export async function getFavoritedProductIds(
  userId: string | undefined,
  productIds: string[]
): Promise<Set<string>> {
  if (!userId || productIds.length === 0) return new Set();
  const rows = await prisma.favorite.findMany({
    where: { userId, productId: { in: productIds } },
    select: { productId: true },
  });
  return new Set(rows.map((r) => r.productId));
}
