import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Búsqueda rápida de variantes por nombre de producto, SKU o código de barras.
// La usan tanto el buscador del panel de admin como el POS (donde además
// puede recibir el código leído por un lector de código de barras, que
// simplemente escribe el código y un "Enter" en este mismo input).
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const locationId = req.nextUrl.searchParams.get("locationId");

  if (!q) return NextResponse.json({ results: [] });

  const variants = await prisma.productVariant.findMany({
    where: {
      active: true,
      OR: [
        { sku: { equals: q, mode: "insensitive" } },
        { barcode: { equals: q } },
        { name: { contains: q, mode: "insensitive" } },
        { product: { name: { contains: q, mode: "insensitive" } } },
      ],
    },
    include: {
      product: { select: { name: true } },
      stockItems: locationId ? { where: { locationId } } : true,
    },
    take: 20,
  });

  const results = variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    barcode: v.barcode,
    name: `${v.product.name} - ${v.name}`,
    price: v.price.toString(),
    stock: v.stockItems.reduce((sum, s) => sum + s.quantity, 0),
  }));

  return NextResponse.json({ results });
}
