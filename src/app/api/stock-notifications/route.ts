import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  variantId: z.string().min(1),
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Faltan datos válidos." }, { status: 400 });
  }

  const variant = await prisma.productVariant.findUnique({
    where: { id: parsed.data.variantId },
    select: { id: true },
  });
  if (!variant) {
    return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
  }

  // Pedir el aviso dos veces con el mismo email no es un error para quien
  // completa el formulario: se responde igual de bien la segunda vez.
  await prisma.stockNotification.upsert({
    where: { variantId_email: { variantId: parsed.data.variantId, email: parsed.data.email } },
    update: {},
    create: { variantId: parsed.data.variantId, email: parsed.data.email },
  });

  return NextResponse.json({ ok: true });
}
