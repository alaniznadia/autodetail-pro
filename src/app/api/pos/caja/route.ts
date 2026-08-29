import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/api-auth";
import { sumPosPaymentsByMethod } from "@/lib/cash-register";

// Estado de la caja actual de una sucursal: si hay una sesión abierta,
// devuelve también los totales por método de pago acumulados hasta ahora
// (para mostrar una vista previa antes de cerrar).
export async function GET(req: NextRequest) {
  const { session, response } = await requireStaff();
  if (response) return response;

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

  const [totals, location, stockItems] = await Promise.all([
    sumPosPaymentsByMethod(locationId, cashSession.openedAt, new Date()),
    prisma.location.findUnique({ where: { id: locationId }, select: { name: true } }),
    prisma.stockItem.findMany({
      where: { locationId },
      include: { variant: { include: { product: { select: { name: true } } } } },
    }),
  ]);

  // Igual que /admin/stock y lib/reports.ts: Prisma no compara dos columnas
  // entre sí en el where, así que se trae todo y se filtra acá.
  const lowStock = stockItems
    .filter((item) => item.quantity <= item.lowStockAlert)
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      name: `${item.variant.product.name} — ${item.variant.name}`,
      quantity: item.quantity,
    }));

  return NextResponse.json({
    session: cashSession,
    totals,
    locationName: location?.name ?? "",
    operatorName: session.user.name ?? session.user.email,
    lowStock,
  });
}
