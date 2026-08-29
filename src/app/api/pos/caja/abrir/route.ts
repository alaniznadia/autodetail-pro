import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/api-auth";

const schema = z.object({
  locationId: z.string().min(1),
  openingAmount: z.coerce.number().nonnegative(),
});

export async function POST(req: NextRequest) {
  const { session, response } = await requireStaff();
  if (response) return response;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.cashRegisterSession.findFirst({
    where: { locationId: parsed.data.locationId, closedAt: null },
  });
  if (existing) {
    return NextResponse.json({ error: "Ya hay una caja abierta en esta sucursal." }, { status: 409 });
  }

  const created = await prisma.cashRegisterSession.create({
    data: {
      locationId: parsed.data.locationId,
      openedById: session.user.id,
      openingAmount: parsed.data.openingAmount,
    },
  });

  return NextResponse.json({ session: created }, { status: 201 });
}
