import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Un cliente puede reseñar un producto si tiene al menos un pedido que lo
// incluya y que no esté pendiente, cancelado o reembolsado — no hace
// falta que ya lo haya recibido, alcanza con que la compra sea real.
const NOT_A_VERIFIED_PURCHASE: OrderStatus[] = ["PENDING", "CANCELLED", "REFUNDED"];

export async function hasVerifiedPurchase(customerId: string, productId: string) {
  const orderItem = await prisma.orderItem.findFirst({
    where: {
      variant: { productId },
      order: {
        customerId,
        status: { notIn: NOT_A_VERIFIED_PURCHASE },
      },
    },
  });
  return orderItem !== null;
}

export class ReviewNotAllowedError extends Error {}

export async function upsertReview(input: {
  productId: string;
  customerId: string;
  rating: number;
  comment?: string;
}) {
  if (input.rating < 1 || input.rating > 5) {
    throw new ReviewNotAllowedError("La calificación tiene que ser de 1 a 5.");
  }

  const verified = await hasVerifiedPurchase(input.customerId, input.productId);
  if (!verified) {
    throw new ReviewNotAllowedError(
      "Solo podés dejar una reseña de productos que hayas comprado."
    );
  }

  // Toda reseña nueva o editada vuelve a quedar pendiente de moderación
  // (approved: false) — un admin la aprueba desde /admin/resenas antes de
  // que se muestre en la tienda.
  return prisma.review.upsert({
    where: {
      productId_customerId: { productId: input.productId, customerId: input.customerId },
    },
    update: { rating: input.rating, comment: input.comment, approved: false },
    create: {
      productId: input.productId,
      customerId: input.customerId,
      rating: input.rating,
      comment: input.comment,
      approved: false,
    },
  });
}
