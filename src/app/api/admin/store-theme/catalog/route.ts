import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { STORE_THEME_ID, BODY_FONTS } from "@/lib/store-theme";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const schema = z.object({
  catalogButtonColor: z.string().regex(HEX_COLOR, "Tiene que ser un color hexadecimal, ej: #ffffff").nullable(),
  catalogFont: z.enum(BODY_FONTS.map((f) => f.value) as [string, ...string[]]).nullable(),
  catalogFontSizePx: z.coerce.number().int().min(10).max(28).nullable(),
});

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const theme = await prisma.storeTheme.upsert({
    where: { id: STORE_THEME_ID },
    update: parsed.data,
    create: { id: STORE_THEME_ID, ...parsed.data },
  });

  return NextResponse.json({ theme });
}
