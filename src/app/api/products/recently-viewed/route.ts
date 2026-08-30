import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Resuelve los slugs guardados en localStorage por TrackRecentlyViewed a
// datos de producto para el bloque "Recién vistos" de la home. El orden de
// la respuesta respeta el de los slugs pedidos (más reciente primero).
export async function GET(req: NextRequest) {
  const slugsParam = req.nextUrl.searchParams.get("slugs")?.trim();
  if (!slugsParam) return NextResponse.json({ products: [] });

  const slugs = slugsParam.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12);
  if (slugs.length === 0) return NextResponse.json({ products: [] });

  const products = await prisma.product.findMany({
    where: { active: true, slug: { in: slugs } },
    include: {
      variants: { where: { active: true }, take: 1, include: { stockItems: true } },
      images: { take: 1 },
      reviews: { where: { approved: true }, select: { rating: true } },
    },
  });

  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const items = slugs
    .map((slug) => bySlug.get(slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((product) => {
      const variant = product.variants[0];
      const image = product.images[0];
      const stock = variant?.stockItems.reduce((sum, s) => sum + s.quantity, 0) ?? 0;
      const reviewCount = product.reviews.length;
      const rating =
        reviewCount > 0
          ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
          : null;
      return {
        id: product.id,
        slug: product.slug,
        sku: variant?.sku ?? "",
        name: product.name,
        variantId: variant?.id ?? "",
        variantName: variant?.name ?? "",
        variantLabel: variant && variant.name !== "Único" ? variant.name : null,
        price: variant?.price.toString() ?? "0",
        stock,
        imageUrl: image?.url ?? null,
        rating,
        reviewCount,
      };
    });

  return NextResponse.json({ products: items });
}
