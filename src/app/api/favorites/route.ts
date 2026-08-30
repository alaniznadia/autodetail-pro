import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({ productId: z.string().min(1) });

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ productIds: [] });

  const favorites = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    select: { productId: true },
  });
  return NextResponse.json({ productIds: favorites.map((f) => f.productId) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Falta productId" }, { status: 400 });
  }

  await prisma.favorite.upsert({
    where: { userId_productId: { userId: session.user.id, productId: parsed.data.productId } },
    update: {},
    create: { userId: session.user.id, productId: parsed.data.productId },
  });

  return NextResponse.json({ favorited: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "Falta productId" }, { status: 400 });
  }

  await prisma.favorite.deleteMany({
    where: { userId: session.user.id, productId },
  });

  return NextResponse.json({ favorited: false });
}
