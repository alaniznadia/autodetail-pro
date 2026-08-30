import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { STORE_THEME_ID } from "@/lib/store-theme";

const schema = z.object({
  // Solo dígitos (código de país + número, sin "+" ni espacios), como lo
  // pide el formato de enlace de wa.me. Vacío/undefined lo apaga.
  whatsappNumber: z.string().regex(/^\d*$/).max(20).optional(),
});

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const whatsappNumber = parsed.data.whatsappNumber?.trim() || null;

  const theme = await prisma.storeTheme.upsert({
    where: { id: STORE_THEME_ID },
    update: { whatsappNumber },
    create: { id: STORE_THEME_ID, whatsappNumber },
  });

  return NextResponse.json({ theme });
}
