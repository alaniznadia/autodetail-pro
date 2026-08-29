import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { RESTOCK_STATUSES, restockOrderItems } from "@/lib/stock-returns";
import { notifyOrderStatusChanged } from "@/lib/order-notifications";
import { accruePointsForOrder, reversePointsForOrder } from "@/lib/loyalty";

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
  const { session, response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const order = await prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUniqueOrThrow({ where: { id } });

    const updated = await tx.order.update({
      where: { id },
      data: {
        status: parsed.data.status,
        statusHistory: {
          create: { status: parsed.data.status, note: "Actualizado desde el panel" },
        },
      },
    });

    // Solo devolvemos stock la primera vez que el pedido entra a un estado
    // cancelado/reembolsado; si ya estaba en uno de esos estados, no
    // duplicamos el ingreso. Mismo cuidado con los puntos de fidelidad.
    if (RESTOCK_STATUSES.has(parsed.data.status) && !RESTOCK_STATUSES.has(existing.status)) {
      await restockOrderItems(tx, id, existing.locationId, session?.user?.id);
      await reversePointsForOrder(tx, id);
    } else if (parsed.data.status === "PAID" && existing.status !== "PAID") {
      await accruePointsForOrder(tx, id);
    }

    return updated;
  });

  await notifyOrderStatusChanged(order.id);

  return NextResponse.json({ order });
}
