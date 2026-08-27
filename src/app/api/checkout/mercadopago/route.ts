import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createPreferenceForOrder } from "@/lib/mercadopago";

const schema = z.object({ orderId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "orderId inválido" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
    include: {
      items: { include: { variant: { include: { product: true } } } },
      payments: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  try {
    const preference = await createPreferenceForOrder(order);

    const payment = order.payments.find((p) => p.method === "MERCADO_PAGO");
    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { mpPreferenceId: preference.id },
      });
    }

    return NextResponse.json({
      initPoint: preference.sandbox_init_point ?? preference.init_point,
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("MERCADOPAGO_ACCESS_TOKEN")) {
      return NextResponse.json(
        { error: "Mercado Pago todavía no está configurado en la tienda." },
        { status: 503 }
      );
    }
    console.error("Error creando preferencia de Mercado Pago", err);
    return NextResponse.json(
      { error: "No se pudo iniciar el pago con Mercado Pago." },
      { status: 500 }
    );
  }
}
