import { Prisma, type PrismaClient, type Coupon } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class InvalidCouponError extends Error {}

type TxClient = Prisma.TransactionClient | PrismaClient;

function computeDiscount(coupon: Coupon, subtotal: Prisma.Decimal): Prisma.Decimal {
  let discount = new Prisma.Decimal(0);
  if (coupon.percentOff) discount = subtotal.mul(coupon.percentOff).div(100);
  if (coupon.amountOff) discount = discount.add(coupon.amountOff);
  return discount.gt(subtotal) ? subtotal : discount;
}

async function findValidCoupon(client: TxClient, code: string, subtotal: Prisma.Decimal) {
  const coupon = await client.coupon.findFirst({
    where: { code: { equals: code.trim(), mode: "insensitive" } },
  });

  if (!coupon || !coupon.active) {
    throw new InvalidCouponError("El cupón no existe o ya no está activo.");
  }
  const now = new Date();
  if (coupon.startsAt && now < coupon.startsAt) {
    throw new InvalidCouponError("Este cupón todavía no está vigente.");
  }
  if (coupon.expiresAt && now > coupon.expiresAt) {
    throw new InvalidCouponError("Este cupón ya venció.");
  }
  if (coupon.minOrderTotal && subtotal.lt(coupon.minOrderTotal)) {
    throw new InvalidCouponError(
      `Este cupón requiere una compra mínima de $${coupon.minOrderTotal.toString()}.`
    );
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    throw new InvalidCouponError("Este cupón alcanzó el límite de usos.");
  }

  return coupon;
}

/**
 * Validación de solo lectura para mostrar el descuento en el checkout
 * antes de confirmar. No reserva el uso del cupón (eso pasa en
 * claimCoupon, dentro de la transacción de creación del pedido).
 */
export async function previewCoupon(code: string, subtotal: Prisma.Decimal) {
  const coupon = await findValidCoupon(prisma, code, subtotal);
  return { discountTotal: computeDiscount(coupon, subtotal) };
}

/**
 * Reserva el uso de un cupón de forma atómica (evita que dos compras
 * simultáneas superen maxUses, con el mismo patrón de UPDATE
 * condicionado que usa el descuento de stock) y devuelve el descuento a
 * aplicar. Debe llamarse dentro de la transacción que crea el pedido.
 */
/**
 * Cupón para promocionar en el catálogo (no requiere estar logueado ni
 * conocer el código de antemano). Se toma el más nuevo entre los vigentes
 * por fecha y con usos disponibles; no revela cupones privados que ya
 * agotaron su cupo o todavía no empezaron/ya vencieron.
 */
export async function getActivePromoCoupon() {
  const now = new Date();
  const coupons = await prisma.coupon.findMany({
    where: {
      active: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] }],
    },
    orderBy: { createdAt: "desc" },
  });
  return coupons.find((c) => c.maxUses === null || c.usedCount < c.maxUses) ?? null;
}

export async function claimCoupon(tx: Prisma.TransactionClient, code: string, subtotal: Prisma.Decimal) {
  const coupon = await findValidCoupon(tx, code, subtotal);

  if (coupon.maxUses !== null) {
    const updated = await tx.coupon.updateMany({
      where: { id: coupon.id, usedCount: { lt: coupon.maxUses } },
      data: { usedCount: { increment: 1 } },
    });
    if (updated.count === 0) {
      throw new InvalidCouponError("Este cupón alcanzó el límite de usos.");
    }
  } else {
    await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
  }

  return { couponId: coupon.id, discountTotal: computeDiscount(coupon, subtotal) };
}
