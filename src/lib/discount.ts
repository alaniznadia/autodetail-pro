import { Prisma } from "@prisma/client";

export type ManualDiscountInput = { type: "PERCENT" | "AMOUNT"; value: number };

/**
 * Descuento manual aplicado por el vendedor al momento de la venta (sin
 * necesidad de crear un cupón). Se recalcula siempre a partir del
 * subtotal real en el servidor, nunca se confía en un monto ya
 * calculado que venga del cliente.
 */
export function computeManualDiscountAmount(
  subtotal: Prisma.Decimal,
  discount: ManualDiscountInput
): Prisma.Decimal {
  return discount.type === "PERCENT"
    ? subtotal.mul(discount.value).div(100)
    : new Prisma.Decimal(discount.value);
}
