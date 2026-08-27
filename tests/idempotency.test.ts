import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createPosSale } from "@/lib/sales";

describe("idempotencia de ventas POS", () => {
  let locationId: string;
  let userId: string;
  let categoryId: string;
  let productId: string;
  let variantId: string;

  beforeAll(async () => {
    const location = await prisma.location.create({ data: { name: "Sucursal de test" } });
    locationId = location.id;

    const user = await prisma.user.create({
      data: { email: `test-idem-${Date.now()}@epicshine.local`, role: "EMPLOYEE" },
    });
    userId = user.id;

    const category = await prisma.category.create({
      data: { name: "Test", slug: `test-idem-${Date.now()}` },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
      data: { name: "Producto de test", slug: `producto-test-idem-${Date.now()}`, categoryId: category.id },
    });
    productId = product.id;

    const variant = await prisma.productVariant.create({
      data: { productId: product.id, sku: `SKU-IDEM-${Date.now()}`, name: "Único", price: "1000.00" },
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

  it("un reintento con la misma clave devuelve el mismo pedido sin descontar stock dos veces", async () => {
    const key = `idem-${Date.now()}`;

    const first = await createPosSale({
      locationId,
      soldById: userId,
      paymentMethod: "CASH",
      idempotencyKey: key,
      items: [{ variantId, quantity: 2 }],
    });

    const retry = await createPosSale({
      locationId,
      soldById: userId,
      paymentMethod: "CASH",
      idempotencyKey: key,
      items: [{ variantId, quantity: 2 }],
    });

    expect(retry.id).toBe(first.id);

    const stock = await prisma.stockItem.findUniqueOrThrow({
      where: { variantId_locationId: { variantId, locationId } },
    });
    expect(stock.quantity).toBe(8); // solo se descontó una vez

    const orderCount = await prisma.order.count({ where: { idempotencyKey: key } });
    expect(orderCount).toBe(1);
  });

  it("dos requests simultáneos con la misma clave no crean dos pedidos", async () => {
    const key = `idem-race-${Date.now()}`;

    const results = await Promise.allSettled([
      createPosSale({
        locationId,
        soldById: userId,
        paymentMethod: "CASH",
        idempotencyKey: key,
        items: [{ variantId, quantity: 1 }],
      }),
      createPosSale({
        locationId,
        soldById: userId,
        paymentMethod: "CASH",
        idempotencyKey: key,
        items: [{ variantId, quantity: 1 }],
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled).toHaveLength(2); // ambos "éxito": el segundo recibe el mismo pedido

    const ids = fulfilled.map((r) => (r as PromiseFulfilledResult<{ id: string }>).value.id);
    expect(new Set(ids).size).toBe(1); // pero es el mismo pedido en los dos casos

    const orderCount = await prisma.order.count({ where: { idempotencyKey: key } });
    expect(orderCount).toBe(1);
  });
});
