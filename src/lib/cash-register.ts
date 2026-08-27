import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Suma los pagos aprobados de ventas del POS en una sucursal, agrupados
 * por método de pago, dentro de una ventana de tiempo. Es la misma
 * lógica que usa tanto la vista previa de caja (sesión todavía abierta)
 * como el cierre definitivo, para que el número mostrado antes de cerrar
 * coincida con el que se guarda al cerrar.
 */
export async function sumPosPaymentsByMethod(
  locationId: string,
  openedAt: Date,
  closedAt: Date
) {
  const payments = await prisma.payment.findMany({
    where: {
      status: "APPROVED",
      order: {
        channel: "POS",
        locationId,
        createdAt: { gte: openedAt, lte: closedAt },
      },
    },
    select: { method: true, amount: true },
  });

  const totals = {
    cashTotal: new Prisma.Decimal(0),
    cardTotal: new Prisma.Decimal(0),
    mpTotal: new Prisma.Decimal(0),
    transferTotal: new Prisma.Decimal(0),
  };

  for (const payment of payments) {
    if (payment.method === "CASH") totals.cashTotal = totals.cashTotal.add(payment.amount);
    else if (payment.method === "CARD") totals.cardTotal = totals.cardTotal.add(payment.amount);
    else if (payment.method === "MERCADO_PAGO")
      totals.mpTotal = totals.mpTotal.add(payment.amount);
    else if (payment.method === "TRANSFER")
      totals.transferTotal = totals.transferTotal.add(payment.amount);
  }

  return totals;
}
