import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createPosSale } from "@/lib/sales";
import { sumPosPaymentsByMethod } from "@/lib/cash-register";

describe("sumPosPaymentsByMethod", () => {
  let locationId: string;
  let otherLocationId: string;
  let userId: string;
  let categoryId: string;
  let productId: string;
  let variantId: string;
  let windowStart: Date;
  let windowEnd: Date;

  beforeAll(async () => {
    const [location, otherLocation] = await Promise.all([
      prisma.location.create({ data: { name: "Sucursal de test" } }),
      prisma.location.create({ data: { name: "Otra sucursal de test" } }),
    ]);
    locationId = location.id;
    otherLocationId = otherLocation.id;

    const user = await prisma.user.create({
      data: { email: `test-cashreg-${Date.now()}@epicshine.local`, role: "EMPLOYEE" },
    });
    userId = user.id;

    const category = await prisma.category.create({
      data: { name: "Test", slug: `test-cashreg-${Date.now()}` },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
      data: { name: "Producto de test", slug: `producto-test-cashreg-${Date.now()}`, categoryId },
    });
    productId = product.id;

    const variant = await prisma.productVariant.create({
      data: { productId, sku: `SKU-CASHREG-${Date.now()}`, name: "Único", price: "1000.00" },
    });
    variantId = variant.id;

    await Promise.all([
      prisma.stockItem.create({ data: { variantId, locationId, quantity: 100 } }),
      prisma.stockItem.create({ data: { variantId, locationId: otherLocationId, quantity: 100 } }),
    ]);

    windowStart = new Date(Date.now() - 60_000);

    // Venta en efectivo y venta con tarjeta en la sucursal bajo prueba.
    await createPosSale({
      locationId,
      soldById: userId,
      paymentMethod: "CASH",
      items: [{ variantId, quantity: 1 }],
    });
    await createPosSale({
      locationId,
      soldById: userId,
      paymentMethod: "CARD",
      items: [{ variantId, quantity: 2 }],
    });
    // Venta en otra sucursal: no debería sumar en el total de la primera.
    await createPosSale({
      locationId: otherLocationId,
      soldById: userId,
      paymentMethod: "CASH",
      items: [{ variantId, quantity: 1 }],
    });

    windowEnd = new Date(Date.now() + 60_000);
  });

  afterAll(async () => {
    const orders = await prisma.order.findMany({
      where: { locationId: { in: [locationId, otherLocationId] } },
      select: { id: true },
    });
    const orderIds = orders.map((o) => o.id);
    await prisma.stockMovement.deleteMany({ where: { locationId: { in: [locationId, otherLocationId] } } });
    await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.stockItem.deleteMany({ where: { locationId: { in: [locationId, otherLocationId] } } });
    await prisma.productVariant.delete({ where: { id: variantId } });
    await prisma.product.delete({ where: { id: productId } });
    await prisma.category.delete({ where: { id: categoryId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.location.deleteMany({ where: { id: { in: [locationId, otherLocationId] } } });
    await prisma.$disconnect();
  });

  it("suma los pagos aprobados por método dentro de la sucursal y la ventana de tiempo", async () => {
    const totals = await sumPosPaymentsByMethod(locationId, windowStart, windowEnd);

    expect(totals.cashTotal.toString()).toBe("1000");
    expect(totals.cardTotal.toString()).toBe("2000");
    expect(totals.mpTotal.toString()).toBe("0");
    expect(totals.transferTotal.toString()).toBe("0");
  });

  it("no mezcla ventas de otra sucursal", async () => {
    const totals = await sumPosPaymentsByMethod(otherLocationId, windowStart, windowEnd);
    expect(totals.cashTotal.toString()).toBe("1000");
  });

  it("ignora ventas fuera de la ventana de tiempo", async () => {
    const pastWindowStart = new Date(windowStart.getTime() - 3_600_000);
    const pastWindowEnd = new Date(windowStart.getTime() - 1_000);
    const totals = await sumPosPaymentsByMethod(locationId, pastWindowStart, pastWindowEnd);

    expect(totals.cashTotal.toString()).toBe("0");
    expect(totals.cardTotal.toString()).toBe("0");
  });
});
