import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sumPosPaymentsByMethod } from "@/lib/cash-register";

// Estado de la caja actual de una sucursal: si hay una sesión abierta,
// devuelve también los totales por método de pago acumulados hasta ahora
// (para mostrar una vista previa antes de cerrar).
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "EMPLOYEE")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const locationId = req.nextUrl.searchParams.get("locationId");
  if (!locationId) {
    return NextResponse.json({ error: "Falta locationId" }, { status: 400 });
  }

  const cashSession = await prisma.cashRegisterSession.findFirst({
    where: { locationId, closedAt: null },
    orderBy: { openedAt: "desc" },
  });

  if (!cashSession) {
    return NextResponse.json({ session: null });
  }

  const totals = await sumPosPaymentsByMethod(locationId, cashSession.openedAt, new Date());

  return NextResponse.json({ session: cashSession, totals });
}
