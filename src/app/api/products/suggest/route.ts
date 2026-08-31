import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Sugerencias en vivo para el buscador de la tienda pública: a diferencia
// de /api/products/search (que usa el POS/admin y devuelve una fila por
// variante, sin filtrar por producto activo), acá cada resultado es un
// producto activo, listo para linkear a /producto/[slug].
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const products = await prisma.product.findMany({
    where: { active: true, name: { contains: q, mode: "insensitive" } },
    include: {
      variants: { where: { active: true }, take: 1, orderBy: { price: "asc" } },
      images: { take: 1, orderBy: { position: "asc" } },
    },
    orderBy: { name: "asc" },
    take: 8,
  });

  const results = products
    .filter((p) => p.variants.length > 0)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      price: p.variants[0].price.toString(),
      imageUrl: p.images[0]?.url ?? null,
    }));

  return NextResponse.json({ results });
}
