import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(1),
  maxWeightGr: z.coerce.number().int().positive(),
  cost: z.coerce.number().nonnegative(),
});

export async function GET() {
  const rates = await prisma.shippingRate.findMany({ orderBy: { maxWeightGr: "asc" } });
  return NextResponse.json({ rates });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const rate = await prisma.shippingRate.create({ data: parsed.data });
  return NextResponse.json({ rate }, { status: 201 });
}
