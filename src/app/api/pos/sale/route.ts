import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createPosSale } from "@/lib/sales";
import { InsufficientStockError } from "@/lib/errors";
import { InvalidCouponError } from "@/lib/coupons";

const saleSchema = z.object({
  locationId: z.string().min(1),
  paymentMethod: z.enum(["CASH", "CARD", "MERCADO_PAGO", "TRANSFER"]),
  couponCode: z.string().min(1).optional(),
  manualDiscount: z
    .object({
      type: z.enum(["PERCENT", "AMOUNT"]),
      value: z.number().positive(),
    })
    .refine((d) => d.type !== "PERCENT" || d.value <= 100, {
      message: "El descuento porcentual no puede superar 100%.",
    })
    .optional(),
  idempotencyKey: z.string().min(1).max(100).optional(),
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "EMPLOYEE")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = saleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const order = await createPosSale({
      ...parsed.data,
      soldById: session.user.id,
    });
    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof InvalidCouponError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Error creando venta POS", err);
    return NextResponse.json({ error: "No se pudo registrar la venta." }, { status: 500 });
  }
}
