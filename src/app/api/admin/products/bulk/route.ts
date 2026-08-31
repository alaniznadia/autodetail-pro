import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import {
  extractRowsFromFile,
  parseBulkUpload,
  UnsupportedFileError,
  type BulkProductGroup,
  type BulkRowIssue,
} from "@/lib/bulk-products";

// Los serverless functions de Vercel rechazan (antes de que este código
// corra) cualquier body de más de ~4.5 MB, con un error que no es JSON.
// Este límite queda bien por debajo para poder mostrar un mensaje claro
// en vez de que la carga falle de forma confusa.
const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MB

// Descarta del preview las variantes cuyo SKU ya existe en la base (en
// cualquier producto), para no intentar crearlas dos veces. Si un producto
// se queda sin variantes válidas, se descarta el producto entero.
async function excludeExistingSkus(
  groups: BulkProductGroup[]
): Promise<{ groups: BulkProductGroup[]; errors: BulkRowIssue[] }> {
  const allSkus = groups.flatMap((g) => g.variants.map((v) => v.sku));
  if (allSkus.length === 0) return { groups, errors: [] };

  const existing = await prisma.productVariant.findMany({
    where: { sku: { in: allSkus } },
    select: { sku: true },
  });
  const existingSkus = new Set(existing.map((v: { sku: string }) => v.sku));
  if (existingSkus.size === 0) return { groups, errors: [] };

  const errors: BulkRowIssue[] = [];
  const filtered = groups
    .map((group) => {
      const variants = group.variants.filter((v) => {
        if (!existingSkus.has(v.sku)) return true;
        errors.push({ row: v.sourceRow, message: `El SKU "${v.sku}" ya existe en otro producto.` });
        return false;
      });
      return { ...group, variants };
    })
    .filter((group) => group.variants.length > 0);

  return { groups: filtered, errors };
}

async function readFileAndParse(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");
  const mode = formData.get("mode");

  if (!(file instanceof File) || file.size === 0) {
    throw new BadRequestError("Falta el archivo.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new BadRequestError("El archivo no puede pesar más de 4 MB.");
  }
  if (mode !== "preview" && mode !== "commit") {
    throw new BadRequestError("Modo inválido.");
  }

  let rows: string[][];
  try {
    rows = await extractRowsFromFile(file);
  } catch (err) {
    if (err instanceof UnsupportedFileError) throw new BadRequestError(err.message);
    console.error("Error leyendo archivo de carga masiva", err);
    throw new BadRequestError("No se pudo leer el archivo. Verificá que no esté dañado.");
  }

  const categories = await prisma.category.findMany({ select: { id: true, name: true, slug: true } });
  const parsed = parseBulkUpload(rows, categories);
  const { groups, errors: skuErrors } = await excludeExistingSkus(parsed.groups);

  return {
    mode: mode as "preview" | "commit",
    groups,
    errors: [...parsed.errors, ...skuErrors],
    warnings: parsed.warnings,
    totalDataRows: parsed.totalDataRows,
  };
}

class BadRequestError extends Error {}

// Nunca dejamos que un error inesperado se escape sin capturar: un error no
// manejado en un route handler puede devolver una respuesta que no es JSON
// (o vacía), y el cliente no tiene forma de mostrar qué pasó en realidad.
export async function POST(req: NextRequest) {
  try {
    return await handlePost(req);
  } catch (err) {
    if (err instanceof BadRequestError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Error inesperado en carga masiva de productos", err);
    return NextResponse.json(
      { error: "Ocurrió un error inesperado procesando la carga masiva." },
      { status: 500 }
    );
  }
}

async function handlePost(req: NextRequest) {
  const parsed = await readFileAndParse(req);
  const variantCount = parsed.groups.reduce((sum, g) => sum + g.variants.length, 0);

  if (parsed.mode === "preview") {
    return NextResponse.json({
      groups: parsed.groups,
      errors: parsed.errors,
      warnings: parsed.warnings,
      totalDataRows: parsed.totalDataRows,
      productCount: parsed.groups.length,
      variantCount,
    });
  }

  if (parsed.groups.length === 0) {
    return NextResponse.json(
      { error: "No hay ningún producto válido para crear.", errors: parsed.errors, warnings: parsed.warnings },
      { status: 400 }
    );
  }

  const mainLocation = await prisma.location.findFirst({ where: { isMain: true } });
  if (!mainLocation) {
    return NextResponse.json(
      { error: "No hay ninguna sucursal principal configurada." },
      { status: 400 }
    );
  }

  const createdProducts: { id: string; name: string }[] = [];
  const failed: { name: string; error: string }[] = [];

  for (const group of parsed.groups) {
    try {
      const baseSlug = slugify(group.name);
      let slug = baseSlug;
      let suffix = 1;
      while (await prisma.product.findUnique({ where: { slug } })) {
        suffix += 1;
        slug = `${baseSlug}-${suffix}`;
      }

      const product = await prisma.product.create({
        data: {
          name: group.name,
          slug,
          brand: group.brand,
          description: group.description,
          categoryId: group.categoryId,
          active: group.active,
          variants: {
            create: group.variants.map((v) => ({
              sku: v.sku,
              name: v.name,
              price: v.price,
              costPrice: v.costPrice,
              barcode: v.barcode,
              stockItems: {
                create: { locationId: mainLocation.id, quantity: v.initialStock },
              },
            })),
          },
        },
      });

      createdProducts.push({ id: product.id, name: product.name });
    } catch (err: unknown) {
      console.error(`Error creando producto "${group.name}" en carga masiva`, err);
      const message =
        err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002"
          ? "SKU o código de barras duplicado."
          : "No se pudo crear el producto.";
      failed.push({ name: group.name, error: message });
    }
  }

  return NextResponse.json({
    created: createdProducts.length,
    createdProducts,
    failed,
    errors: parsed.errors,
    warnings: parsed.warnings,
  });
}
