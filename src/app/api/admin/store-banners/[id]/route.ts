import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { deleteSiteImageFile } from "@/lib/site-images";
import { requireAdmin } from "@/lib/api-auth";

const schema = z.object({ active: z.boolean() });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const banner = await prisma.storeBanner
    .update({ where: { id }, data: { active: parsed.data.active } })
    .catch(() => null);
  if (!banner) {
    return NextResponse.json({ error: "Banner no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ banner });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const banner = await prisma.storeBanner.delete({ where: { id } }).catch(() => null);
  if (banner) await deleteSiteImageFile(banner.imageUrl);
  return NextResponse.json({ ok: true });
}
