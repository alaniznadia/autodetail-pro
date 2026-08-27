import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { hasVerifiedPurchase, upsertReview, ReviewNotAllowedError } from "@/lib/reviews";

describe("reviews", () => {
  let locationId: string;
  let customerId: string;
  let categoryId: string;
  let productId: string;
  let variantId: string;
  let orderId: string;

  beforeAll(async () => {
    const location = await prisma.location.create({ data: { name: "Sucursal de test" } });
    locationId = location.id;

    const customer = await prisma.user.create({
      data: { email: `test-reviews-${Date.now()}@epicshine.local`, role: "CUSTOMER" },
    });
    customerId = customer.id;

    const category = await prisma.category.create({
      data: { name: "Test", slug: `test-reviews-${Date.now()}` },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
      data: { name: "Producto de test", slug: `producto-test-reviews-${Date.now()}`, categoryId },
    });
    productId = product.id;

    const variant = await prisma.productVariant.create({
      data: { productId, sku: `SKU-REVIEWS-${Date.now()}`, name: "Único", price: "1000.00" },
    });
    variantId = variant.id;

    const order = await prisma.order.create({
      data: {
        channel: "ONLINE",
        status: "PENDING",
        fulfillmentMethod: "STORE_PICKUP",
        locationId,
        customerId,
        subtotal: "1000.00",
        total: "1000.00",
        items: { create: [{ variantId, quantity: 1, unitPrice: "1000.00", totalPrice: "1000.00" }] },
      },
    });
    orderId = order.id;
  });

  afterAll(async () => {
    await prisma.review.deleteMany({ where: { customerId } });
    await prisma.orderItem.deleteMany({ where: { orderId } });
    await prisma.order.delete({ where: { id: orderId } });
    await prisma.productVariant.delete({ where: { id: variantId } });
    await prisma.product.delete({ where: { id: productId } });
    await prisma.category.delete({ where: { id: categoryId } });
    await prisma.user.delete({ where: { id: customerId } });
    await prisma.location.delete({ where: { id: locationId } });
    await prisma.$disconnect();
  });

  it("no permite reseñar mientras el pedido está PENDING", async () => {
    expect(await hasVerifiedPurchase(customerId, productId)).toBe(false);
    await expect(
      upsertReview({ productId, customerId, rating: 5 })
    ).rejects.toThrow(ReviewNotAllowedError);
  });

  it("permite reseñar una vez que el pedido está pagado", async () => {
    await prisma.order.update({ where: { id: orderId }, data: { status: "PAID" } });

    expect(await hasVerifiedPurchase(customerId, productId)).toBe(true);

    const review = await upsertReview({
      productId,
      customerId,
      rating: 4,
      comment: "Buen producto",
    });
    expect(review.rating).toBe(4);
  });

  it("actualiza la reseña existente en vez de duplicarla", async () => {
    const updated = await upsertReview({
      productId,
      customerId,
      rating: 2,
      comment: "Cambié de opinión",
    });

    const reviews = await prisma.review.findMany({ where: { productId, customerId } });
    expect(reviews).toHaveLength(1);
    expect(updated.rating).toBe(2);
    expect(updated.comment).toBe("Cambié de opinión");
  });

  it("no permite reseñar un pedido cancelado o reembolsado", async () => {
    await prisma.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
    expect(await hasVerifiedPurchase(customerId, productId)).toBe(false);
  });

  it("rechaza una calificación fuera de 1 a 5", async () => {
    await prisma.order.update({ where: { id: orderId }, data: { status: "PAID" } });
    await expect(
      upsertReview({ productId, customerId, rating: 6 })
    ).rejects.toThrow(ReviewNotAllowedError);
  });
});
