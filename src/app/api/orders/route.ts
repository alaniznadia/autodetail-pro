import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createOnlineOrder } from "@/lib/orders";
import { InsufficientStockError } from "@/lib/errors";
import { InvalidCouponError } from "@/lib/coupons";

const orderSchema = z.object({
  fulfillmentMethod: z.enum(["SHIPPING", "STORE_PICKUP"]),
  paymentMethod: z.enum(["CASH", "TRANSFER", "MERCADO_PAGO"]),
  guestName: z.string().min(1),
  guestEmail: z.string().email(),
  guestPhone: z.string().min(6),
  couponCode: z.string().min(1).optional(),
  idempotencyKey: z.string().min(1).max(100).optional(),
  shippingAddress: z
    .object({
      street: z.string().min(1),
      number: z.string().min(1),
      floorApt: z.string().optional(),
      city: z.string().min(1),
      province: z.string().min(1),
      postalCode: z.string().min(1),
    })
    .optional(),
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
  const body = await req.json();
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  if (data.fulfillmentMethod === "SHIPPING" && !data.shippingAddress) {
    return NextResponse.json(
      { error: "Falta la dirección de envío." },
      { status: 400 }
    );
  }

  const mainLocation = await prisma.location.findFirst({ where: { isMain: true } });
  if (!mainLocation) {
    return NextResponse.json(
      { error: "La tienda no está configurada todavía (falta la sucursal principal)." },
      { status: 400 }
    );
  }

  const session = await auth();

  try {
    const order = await createOnlineOrder({
      locationId: mainLocation.id,
      items: data.items,
      fulfillmentMethod: data.fulfillmentMethod,
      paymentMethod: data.paymentMethod,
      customerId: session?.user?.id,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone,
      couponCode: data.couponCode,
      idempotencyKey: data.idempotencyKey,
      shippingAddress: data.shippingAddress,
    });
    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return NextResponse.json(
        { error: "Uno de los productos ya no tiene stock suficiente. Revisá tu carrito." },
        { status: 409 }
      );
    }
    if (err instanceof InvalidCouponError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Error creando pedido online", err);
    return NextResponse.json({ error: "No se pudo crear el pedido." }, { status: 500 });
  }
}
