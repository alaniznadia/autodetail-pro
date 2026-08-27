import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createPosSale } from "@/lib/sales";
import { restockOrderItems, RESTOCK_STATUSES } from "@/lib/stock-returns";

describe("restockOrderItems", () => {
  let locationId: string;
  let userId: string;
  let categoryId: string;
  let productId: string;
  let variantId: string;

  beforeAll(async () => {
    const location = await prisma.location.create({ data: { name: "Sucursal de test" } });
    locationId = location.id;

    const user = await prisma.user.create({
      data: { email: `test-restock-${Date.now()}@epicshine.local`, role: "EMPLOYEE" },
    });
    userId = user.id;

    const category = await prisma.category.create({
      data: { name: "Test", slug: `test-restock-${Date.now()}` },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
      data: { name: "Producto de test", slug: `producto-test-restock-${Date.now()}`, categoryId: category.id },
    });
    productId = product.id;

    const variant = await prisma.productVariant.create({
      data: { productId: product.id, sku: `SKU-RESTOCK-${Date.now()}`, name: "Único", price: "1000.00" },
    });
    variantId = variant.id;

    await prisma.stockItem.create({ data: { variantId, locationId, quantity: 10 } });
  });

  afterAll(async () => {
    const orders = await prisma.order.findMany({ where: { locationId }, select: { id: true } });
    const orderIds = orders.map((o) => o.id);
    await prisma.stockMovement.deleteMany({ where: { locationId } });
    await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.stockItem.deleteMany({ where: { locationId } });
    await prisma.productVariant.delete({ where: { id: variantId } });
    await prisma.product.delete({ where: { id: productId } });
    await prisma.category.delete({ where: { id: categoryId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.location.delete({ where: { id: locationId } });
    await prisma.$disconnect();
  });

  it("devuelve el stock descontado al cancelar un pedido", async () => {
    const order = await createPosSale({
      locationId,
      soldById: userId,
      paymentMethod: "CASH",
      items: [{ variantId, quantity: 4 }],
    });

    const afterSale = await prisma.stockItem.findUniqueOrThrow({
      where: { variantId_locationId: { variantId, locationId } },
    });
    expect(afterSale.quantity).toBe(6);

    await prisma.$transaction((tx) => restockOrderItems(tx, order.id, locationId, userId));

    const afterRestock = await prisma.stockItem.findUniqueOrThrow({
      where: { variantId_locationId: { variantId, locationId } },
    });
    expect(afterRestock.quantity).toBe(10);

    const movements = await prisma.stockMovement.findMany({ where: { orderId: order.id } });
    expect(movements.some((m) => m.type === "RETURN_IN" && m.quantity === 4)).toBe(true);
  });

  it("considera CANCELLED y REFUNDED como estados que devuelven stock", () => {
    expect(RESTOCK_STATUSES.has("CANCELLED")).toBe(true);
    expect(RESTOCK_STATUSES.has("REFUNDED")).toBe(true);
    expect(RESTOCK_STATUSES.has("PAID")).toBe(false);
  });
});
