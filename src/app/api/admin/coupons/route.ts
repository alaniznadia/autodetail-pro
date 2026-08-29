import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

const schema = z
  .object({
    code: z.string().min(1),
    percentOff: z.coerce.number().int().min(1).max(100).optional(),
    amountOff: z.coerce.number().positive().optional(),
    minOrderTotal: z.coerce.number().nonnegative().optional(),
    maxUses: z.coerce.number().int().positive().optional(),
    expiresAt: z.string().optional(),
  })
  .refine((data) => data.percentOff || data.amountOff, {
    message: "Definí un porcentaje o un monto de descuento.",
  });

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ coupons });
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.coupon.findFirst({
    where: { code: { equals: data.code, mode: "insensitive" } },
  });
  if (existing) {
    return NextResponse.json({ error: "Ya existe un cupón con ese código." }, { status: 409 });
  }

  const coupon = await prisma.coupon.create({
    data: {
      code: data.code.toUpperCase(),
      percentOff: data.percentOff,
      amountOff: data.amountOff,
      minOrderTotal: data.minOrderTotal,
      maxUses: data.maxUses,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    },
  });

  return NextResponse.json({ coupon }, { status: 201 });
}
