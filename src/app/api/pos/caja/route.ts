import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sumPosPaymentsByMethod } from "@/lib/cash-register";

// Estado de la caja actual de una sucursal: si hay una sesión abierta,
// devuelve también los totales por método de pago acumulados hasta ahora
// (para mostrar una vista previa antes de cerrar).
export async function GET(req: NextRequest) {
  const locationId = req.nextUrl.searchParams.get("locationId");
  if (!locationId) {
    return NextResponse.json({ error: "Falta locationId" }, { status: 400 });
  }

  const session = await prisma.cashRegisterSession.findFirst({
    where: { locationId, closedAt: null },
    orderBy: { openedAt: "desc" },
  });

  if (!session) {
    return NextResponse.json({ session: null });
  }

  const totals = await sumPosPaymentsByMethod(locationId, session.openedAt, new Date());

  return NextResponse.json({ session, totals });
}
