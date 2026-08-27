import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  STORE_THEME_ID,
  HEADING_FONTS,
  BODY_FONTS,
  getStoreTheme,
} from "@/lib/store-theme";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const schema = z.object({
  headingFont: z.enum(HEADING_FONTS.map((f) => f.value) as [string, ...string[]]),
  bodyFont: z.enum(BODY_FONTS.map((f) => f.value) as [string, ...string[]]),
  baseFontSizePx: z.coerce.number().int().min(14).max(20),
  backgroundColor: z.string().regex(HEX_COLOR, "Tiene que ser un color hexadecimal, ej: #0a0a0a"),
  textColor: z.string().regex(HEX_COLOR, "Tiene que ser un color hexadecimal, ej: #f5f5f5"),
  accentColor: z.string().regex(HEX_COLOR, "Tiene que ser un color hexadecimal, ej: #ffffff"),
});

export async function GET() {
  const theme = await getStoreTheme();
  return NextResponse.json({ theme });
}

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
