import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { InvalidRemitoFileError, remitoSourceType, saveRemitoFile } from "@/lib/remito-upload";
import { RemitoExtractionError, extractRemitoItems } from "@/lib/remito-extraction";
import { buildSearchText, findMatches, type MatchCandidate } from "@/lib/product-matching";

// Recibe el remito/ticket subido desde /admin/compras/importar, lo manda a
// leer con IA y devuelve cada ítem ya con sugerencias de qué variante del
// catálogo le corresponde, para que el admin solo tenga que confirmar (o
// corregir) antes de registrar la compra.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo del remito." }, { status: 400 });
  }

  let uploaded;
  try {
    uploaded = await saveRemitoFile(file);
  } catch (err) {
    if (err instanceof InvalidRemitoFileError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  let extraction;
  try {
    extraction = await extractRemitoItems(uploaded.bytes, uploaded.mimeType);
  } catch (err) {
    if (err instanceof RemitoExtractionError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }

  const variants = await prisma.productVariant.findMany({
    where: { active: true },
    include: { product: { select: { name: true, brand: true } } },
  });

  const candidates: MatchCandidate[] = variants.map((v) => ({
    variantId: v.id,
    label: `${v.product.name} - ${v.name}`,
    sku: v.sku,
    barcode: v.barcode,
    searchText: buildSearchText([v.product.name, v.product.brand, v.name]),
  }));

  const items = extraction.items.map((item) => ({
    rawName: item.rawName,
    quantity: item.quantity,
    unitCost: item.unitCost,
    sku: item.sku ?? null,
    barcode: item.barcode ?? null,
    suggestions: findMatches(item.rawName, candidates, item.barcode ?? item.sku),
  }));

  return NextResponse.json({
    sourceFileUrl: uploaded.url,
    sourceType: remitoSourceType(uploaded.mimeType),
    supplierGuess: extraction.supplierName,
    documentDate: extraction.documentDate,
    items,
  });
}
