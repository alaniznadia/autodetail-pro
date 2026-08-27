import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  status: z.enum([
    "PENDING",
    "PAID",
    "PREPARING",
    "SHIPPED",
    "DELIVERED",
    "PICKED_UP",
    "CANCELLED",
    "REFUNDED",
  ]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const order = await prisma.order.update({
    where: { id },
    data: {
      status: parsed.data.status,
      statusHistory: { create: { status: parsed.data.status, note: "Actualizado desde el panel" } },
    },
  });

  return NextResponse.json({ order });
}
