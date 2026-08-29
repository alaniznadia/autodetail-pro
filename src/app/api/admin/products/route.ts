import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { requireAdmin } from "@/lib/api-auth";

const variantSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  price: z.coerce.number().positive(),
  costPrice: z.coerce.number().nonnegative().optional(),
  barcode: z.string().min(1).optional(),
  initialStock: z.coerce.number().int().nonnegative().default(0),
});

const productSchema = z.object({
  name: z.string().min(1),
  brand: z.string().optional(),
  categoryId: z.string().min(1),
  description: z.string().optional(),
  active: z.boolean().default(true),
  variants: z.array(variantSchema).min(1),
});

export async function GET(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  const q = req.nextUrl.searchParams.get("q")?.trim();

  const products = await prisma.product.findMany({
    where: q
      ? { name: { contains: q, mode: "insensitive" } }
      : undefined,
    include: {
      category: { select: { name: true } },
      variants: { include: { stockItems: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await req.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const mainLocation = await prisma.location.findFirst({ where: { isMain: true } });
  if (!mainLocation) {
    return NextResponse.json(
      { error: "No hay ninguna sucursal principal configurada." },
      { status: 400 }
    );
  }

  const baseSlug = slugify(data.name);
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.product.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  try {
    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug,
        brand: data.brand,
        description: data.description,
        categoryId: data.categoryId,
        active: data.active,
        variants: {
          create: data.variants.map((v) => ({
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
      include: { variants: true },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un producto o variante con ese SKU/código de barras." },
        { status: 409 }
      );
    }
    console.error("Error creando producto", err);
    return NextResponse.json({ error: "No se pudo crear el producto." }, { status: 500 });
  }
}
