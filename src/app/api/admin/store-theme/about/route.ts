import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { STORE_THEME_ID } from "@/lib/store-theme";
import { requireAdmin } from "@/lib/api-auth";

const schema = z.object({
  aboutTitle: z.string().max(200).optional(),
  aboutContent: z.string().max(5000).optional(),
});

export async function PATCH(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

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
