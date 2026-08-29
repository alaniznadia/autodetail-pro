import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStoreSettings } from "@/lib/store-settings";

type TxClient = Prisma.TransactionClient | PrismaClient;

export class LoyaltyError extends Error {}

/**
 * Programa de puntos.
 *
 * Reglas:
 * - Se acredita cuando el pedido pasa a PAID (online por webhook de Mercado
 *   Pago o cambio manual desde /admin/pedidos; POS al confirmar la venta).
 * - Base de cálculo: total del pedido SIN envío (no se premian los costos
 *   logísticos) y sin la parte pagada con puntos.
 * - Solo suma un cliente registrado. Pedido de invitado: si el email coincide
 *   con un usuario existente, suma a esa cuenta; si no, no suma.
 * - Idempotente: el unique (orderId, kind) impide acreditar dos veces el mismo
 *   pedido aunque el webhook llegue repetido.
 */

export function pointsForAmount(amount: Prisma.Decimal, arsPerPoint: number): number {
  if (arsPerPoint <= 0) return 0;
  return Math.floor(Number(amount) / arsPerPoint);
}

async function getOrCreateAccount(tx: TxClient, userId: string) {
  return tx.loyaltyAccount.upsert({
    where: { userId },
    update: {},
    create: { userId, balance: 0 },
  });
}

export async function getBalance(userId: string): Promise<number> {
  const account = await prisma.loyaltyAccount.findUnique({ where: { userId } });
  return account?.balance ?? 0;
}

/**
 * Acredita los puntos de un pedido pagado. Llamar DENTRO de la misma
 * transacción que marca el pedido como PAID.
 */
export async function accruePointsForOrder(tx: TxClient, orderId: string) {
  const settings = await getStoreSettings();
  if (!settings.loyaltyEnabled) return null;

  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      customerId: true,
      guestEmail: true,
      total: true,
      shippingCost: true,
      pointsRedeemed: true,
    },
  });
  if (!order) return null;

  let userId = order.customerId;
  if (!userId && order.guestEmail) {
    const user = await tx.user.findUnique({
      where: { email: order.guestEmail },
      select: { id: true },
    });
    userId = user?.id ?? null;
  }
  if (!userId) return null; // invitado sin cuenta: no acumula

  const redeemedValue = new Prisma.Decimal(order.pointsRedeemed).mul(settings.loyaltyPointValue);
  const base = order.total.sub(order.shippingCost).sub(redeemedValue);
  const points = pointsForAmount(base.lt(0) ? new Prisma.Decimal(0) : base, settings.loyaltyArsPerPoint);
  if (points <= 0) return null;

  const account = await getOrCreateAccount(tx, userId);

  try {
    await tx.loyaltyMovement.create({
      data: {
        accountId: account.id,
        kind: "ACCRUAL",
        points,
        orderId: order.id,
        reason: "Pedido pagado",
      },
    });
  } catch (err) {
    // Violación del unique (orderId, kind) = ya se acreditó (webhook repetido).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return null;
    throw err;
  }

  await tx.loyaltyAccount.update({
    where: { id: account.id },
    data: { balance: { increment: points } },
  });

  return points;
}

/**
 * Reserva puntos como descuento al crear un pedido. Llamar DENTRO de la
 * transacción de creación, con el mismo patrón de UPDATE condicionado que
 * usan el stock y los cupones: si dos compras simultáneas intentan gastar el
 * mismo saldo, una sola gana.
 *
 * Devuelve el monto en pesos a descontar.
 */
export async function redeemPoints(
  tx: Prisma.TransactionClient,
  userId: string,
  points: number,
  orderId: string
): Promise<Prisma.Decimal> {
  const settings = await getStoreSettings();
  if (!settings.loyaltyEnabled || points <= 0) return new Prisma.Decimal(0);
  if (points < settings.loyaltyMinRedeem) {
    throw new LoyaltyError(`El canje mínimo es de ${settings.loyaltyMinRedeem} puntos.`);
  }

  const account = await getOrCreateAccount(tx, userId);

  const updated = await tx.loyaltyAccount.updateMany({
    where: { id: account.id, balance: { gte: points } },
    data: { balance: { decrement: points } },
  });
  if (updated.count === 0) {
    throw new LoyaltyError("No tenés suficientes puntos disponibles.");
  }

  await tx.loyaltyMovement.create({
    data: {
      accountId: account.id,
      kind: "REDEMPTION",
      points: -points,
      orderId,
      reason: "Canje en checkout",
    },
  });

  return new Prisma.Decimal(points).mul(settings.loyaltyPointValue);
}

/**
 * Devuelve los puntos de un pedido cancelado o reembolsado: quita la
 * acreditación (si la hubo) y reintegra lo canjeado.
 */
export async function reversePointsForOrder(tx: Prisma.TransactionClient, orderId: string) {
  const movements = await tx.loyaltyMovement.findMany({ where: { orderId } });
  for (const m of movements) {
    if (m.kind === "ADJUSTMENT") continue;
    await tx.loyaltyAccount.update({
      where: { id: m.accountId },
      data: { balance: { decrement: m.points } },
    });
    await tx.loyaltyMovement.create({
      data: {
        accountId: m.accountId,
        kind: "ADJUSTMENT",
        points: -m.points,
        reason: `Reverso de pedido ${orderId}`,
      },
    });
  }
  await tx.loyaltyMovement.deleteMany({
    where: { orderId, kind: { in: ["ACCRUAL", "REDEMPTION"] } },
  });
}
