import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const variantSchema = z.object({
  id: z.string().optional(), // ausente = variante nueva
  sku: z.string().min(1),
  name: z.string().min(1),
  price: z.coerce.number().positive(),
  costPrice: z.coerce.number().nonnegative().optional(),
  barcode: z.string().min(1).optional(),
  stock: z.coerce.number().int().nonnegative(),
});

const updateSchema = z.object({
  name: z.string().min(1),
  brand: z.string().optional(),
  categoryId: z.string().min(1),
  description: z.string().optional(),
  active: z.boolean(),
  variants: z.array(variantSchema).min(1),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: { include: { stockItems: true } } },
  });
  if (!product) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ product });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    // P2025: no existía. P2003: alguna variante tiene pedidos o compras
    // asociadas (la FK es RESTRICT a propósito, para no perder ese
    // historial); en ese caso sugerimos desactivarlo en vez de borrarlo.
    if (err instanceof Error && "code" in err) {
      const code = (err as { code?: string }).code;
      if (code === "P2025") {
        return NextResponse.json({ error: "El producto no existe." }, { status: 404 });
      }
      if (code === "P2003") {
        return NextResponse.json(
          {
            error:
              "No se puede borrar: tiene ventas o compras asociadas. Desactivalo en vez de borrarlo si no querés que se siga vendiendo.",
          },
          { status: 409 }
        );
      }
    }
    console.error("Error borrando producto", err);
    return NextResponse.json({ error: "No se pudo borrar el producto." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
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

  try {
    const product = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          name: data.name,
          brand: data.brand,
          categoryId: data.categoryId,
          description: data.description,
          active: data.active,
        },
      });

      for (const v of data.variants) {
        if (v.id) {
          const current = await tx.stockItem.findUnique({
            where: { variantId_locationId: { variantId: v.id, locationId: mainLocation.id } },
          });
          const delta = v.stock - (current?.quantity ?? 0);

          await tx.productVariant.update({
            where: { id: v.id },
            data: { sku: v.sku, name: v.name, price: v.price, costPrice: v.costPrice, barcode: v.barcode },
          });

          if (current) {
            if (delta !== 0) {
              await tx.stockItem.update({
                where: { variantId_locationId: { variantId: v.id, locationId: mainLocation.id } },
                data: { quantity: v.stock },
              });
            }
          } else {
            await tx.stockItem.create({
              data: { variantId: v.id, locationId: mainLocation.id, quantity: v.stock },
            });
          }

          if (delta !== 0) {
            await tx.stockMovement.create({
              data: {
                variantId: v.id,
                locationId: mainLocation.id,
                type: "ADJUSTMENT",
                quantity: delta,
                reason: "Ajuste manual desde el panel de administración",
                userId: session?.user?.id,
              },
            });
          }
        } else {
          const newVariant = await tx.productVariant.create({
            data: { productId: id, sku: v.sku, name: v.name, price: v.price, costPrice: v.costPrice, barcode: v.barcode },
          });
          await tx.stockItem.create({
            data: { variantId: newVariant.id, locationId: mainLocation.id, quantity: v.stock },
          });
          if (v.stock > 0) {
            await tx.stockMovement.create({
              data: {
                variantId: newVariant.id,
                locationId: mainLocation.id,
                type: "ADJUSTMENT",
                quantity: v.stock,
                reason: "Alta de variante desde el panel de administración",
                userId: session?.user?.id,
              },
            });
          }
        }
      }

      return tx.product.findUniqueOrThrow({
        where: { id },
        include: { variants: { include: { stockItems: true } } },
      });
    });

    return NextResponse.json({ product });
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe una variante con ese SKU/código de barras." },
        { status: 409 }
      );
    }
    console.error("Error actualizando producto", err);
    return NextResponse.json({ error: "No se pudo actualizar el producto." }, { status: 500 });
  }
}
