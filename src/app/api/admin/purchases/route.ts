import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { createPurchaseOrder } from "@/lib/purchases";

const schema = z.object({
  supplierId: z.string().min(1),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.number().int().positive(),
        unitCost: z.number().nonnegative(),
      })
    )
    .min(1),
});

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    include: {
      supplier: { select: { name: true } },
      items: { include: { variant: { include: { product: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ purchaseOrders });
}

export async function POST(req: NextRequest) {
  const { session, response } = await requireAdmin();
  if (response) return response;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const mainLocation = await prisma.location.findFirst({ where: { isMain: true } });
  if (!mainLocation) {
    return NextResponse.json(
      { error: "No hay ninguna sucursal principal configurada." },
      { status: 400 }
    );
  }

  try {
    const purchaseOrder = await createPurchaseOrder({
      supplierId: parsed.data.supplierId,
      locationId: mainLocation.id,
      createdById: session.user.id,
      notes: parsed.data.notes,
      items: parsed.data.items,
    });
    return NextResponse.json({ purchaseOrder }, { status: 201 });
  } catch (err) {
    console.error("Error creando orden de compra", err);
    return NextResponse.json({ error: "No se pudo registrar la compra." }, { status: 500 });
  }
}
