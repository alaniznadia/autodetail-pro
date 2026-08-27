import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createPosSale } from "@/lib/sales";
import { InsufficientStockError } from "@/lib/errors";

// Tests de integración contra una base Postgres real (requieren DATABASE_URL
// configurada). Cubren el camino crítico: una venta del POS tiene que
// descontar stock de forma correcta y nunca vender por encima del stock
// disponible, ni siquiera bajo ventas concurrentes.

describe("createPosSale", () => {
  let locationId: string;
  let userId: string;
  let categoryId: string;
  let productId: string;
  let variantId: string;

  beforeAll(async () => {
    const location = await prisma.location.create({
      data: { name: "Sucursal de test" },
    });
    locationId = location.id;

    const user = await prisma.user.create({
      data: { email: `test-${Date.now()}@epicshine.local`, role: "EMPLOYEE" },
    });
    userId = user.id;

    const category = await prisma.category.create({
      data: { name: "Test", slug: `test-${Date.now()}` },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
      data: {
        name: "Producto de test",
        slug: `producto-test-${Date.now()}`,
        categoryId: category.id,
      },
    });
    productId = product.id;

    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `SKU-TEST-${Date.now()}`,
        name: "Único",
        price: "1000.00",
      },
    });
    variantId = variant.id;

    await prisma.stockItem.create({
      data: { variantId, locationId, quantity: 10 },
    });
  });

  afterAll(async () => {
    // Los tests escriben contra la base real (no hay mocks para la
    // transacción atómica de stock), así que hay que deshacer todo lo que
    // se creó: si no, cada corrida deja pedidos/usuarios/sucursales de
    // prueba acumulándose en la base para siempre.
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

  it("descuenta stock correctamente al confirmar una venta", async () => {
    await createPosSale({
      locationId,
      soldById: userId,
      paymentMethod: "CASH",
      items: [{ variantId, quantity: 3 }],
    });

    const stock = await prisma.stockItem.findUniqueOrThrow({
      where: { variantId_locationId: { variantId, locationId } },
    });
    expect(stock.quantity).toBe(7);
  });

  it("rechaza la venta si no hay stock suficiente y no descuenta nada", async () => {
    await expect(
      createPosSale({
        locationId,
        soldById: userId,
        paymentMethod: "CASH",
        items: [{ variantId, quantity: 999 }],
      })
    ).rejects.toBeInstanceOf(InsufficientStockError);

    const stock = await prisma.stockItem.findUniqueOrThrow({
      where: { variantId_locationId: { variantId, locationId } },
    });
    expect(stock.quantity).toBe(7); // no cambió
  });

  it("no permite que dos ventas concurrentes vendan más stock del disponible", async () => {
    // Quedan 7 unidades: dos ventas de 5 en simultáneo no pueden completarse
    // ambas. Exactamente una debe ganar y la otra fallar.
    const results = await Promise.allSettled([
      createPosSale({
        locationId,
        soldById: userId,
        paymentMethod: "CASH",
        items: [{ variantId, quantity: 5 }],
      }),
      createPosSale({
        locationId,
        soldById: userId,
        paymentMethod: "CASH",
        items: [{ variantId, quantity: 5 }],
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const stock = await prisma.stockItem.findUniqueOrThrow({
      where: { variantId_locationId: { variantId, locationId } },
    });
    expect(stock.quantity).toBe(2);
  });
});
