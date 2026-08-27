import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sumPosPaymentsByMethod } from "@/lib/cash-register";

const schema = z.object({
  sessionId: z.string().min(1),
  closingAmount: z.coerce.number().nonnegative(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const session = await prisma.cashRegisterSession.findUnique({
    where: { id: parsed.data.sessionId },
  });
  if (!session) {
    return NextResponse.json({ error: "Caja no encontrada" }, { status: 404 });
  }
  if (session.closedAt) {
    return NextResponse.json({ error: "Esta caja ya está cerrada." }, { status: 409 });
  }

  const closedAt = new Date();
  const totals = await sumPosPaymentsByMethod(session.locationId, session.openedAt, closedAt);

  const updated = await prisma.cashRegisterSession.update({
    where: { id: session.id },
    data: {
      closedAt,
      closingAmount: parsed.data.closingAmount,
      notes: parsed.data.notes,
      ...totals,
    },
  });

  return NextResponse.json({ session: updated });
}
