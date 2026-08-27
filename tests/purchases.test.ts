import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createPurchaseOrder } from "@/lib/purchases";

describe("createPurchaseOrder", () => {
  let locationId: string;
  let userId: string;
  let supplierId: string;
  let categoryId: string;
  let productId: string;
  let variantId: string;

  beforeAll(async () => {
    const location = await prisma.location.create({ data: { name: "Sucursal de test" } });
    locationId = location.id;

    const user = await prisma.user.create({
      data: { email: `test-purchases-${Date.now()}@epicshine.local`, role: "ADMIN" },
    });
    userId = user.id;

    const supplier = await prisma.supplier.create({ data: { name: "Proveedor de test" } });
    supplierId = supplier.id;

    const category = await prisma.category.create({
      data: { name: "Test", slug: `test-purchases-${Date.now()}` },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
      data: { name: "Producto de test", slug: `producto-test-purchases-${Date.now()}`, categoryId },
    });
    productId = product.id;

    const variant = await prisma.productVariant.create({
      data: {
        productId,
        sku: `SKU-PURCHASE-${Date.now()}`,
        name: "Único",
        price: "1000.00",
        costPrice: "500.00",
      },
    });
    variantId = variant.id;
  });

  afterAll(async () => {
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: { supplierId },
      select: { id: true },
    });
    const purchaseOrderIds = purchaseOrders.map((p) => p.id);
    await prisma.purchaseOrderItem.deleteMany({
      where: { purchaseOrderId: { in: purchaseOrderIds } },
    });
    await prisma.purchaseOrder.deleteMany({ where: { id: { in: purchaseOrderIds } } });
    await prisma.stockMovement.deleteMany({ where: { locationId } });
    await prisma.stockItem.deleteMany({ where: { locationId } });
    await prisma.productVariant.delete({ where: { id: variantId } });
    await prisma.product.delete({ where: { id: productId } });
    await prisma.category.delete({ where: { id: categoryId } });
    await prisma.supplier.delete({ where: { id: supplierId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.location.delete({ where: { id: locationId } });
    await prisma.$disconnect();
  });

  it("ingresa stock nuevo, registra el movimiento y actualiza el costo de la variante", async () => {
    const purchase = await createPurchaseOrder({
      supplierId,
      locationId,
      createdById: userId,
      items: [{ variantId, quantity: 10, unitCost: 600 }],
    });

    expect(purchase.status).toBe("RECEIVED");

    const stockItem = await prisma.stockItem.findUniqueOrThrow({
      where: { variantId_locationId: { variantId, locationId } },
    });
    expect(stockItem.quantity).toBe(10);

    const movement = await prisma.stockMovement.findFirst({
      where: { variantId, locationId, type: "PURCHASE_IN" },
    });
    expect(movement?.quantity).toBe(10);
    expect(movement?.userId).toBe(userId);

    const variant = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    expect(variant.costPrice?.toString()).toBe("600");
  });

  it("suma al stock existente en compras sucesivas", async () => {
    await createPurchaseOrder({
      supplierId,
      locationId,
      createdById: userId,
      items: [{ variantId, quantity: 5, unitCost: 650 }],
    });

    const stockItem = await prisma.stockItem.findUniqueOrThrow({
      where: { variantId_locationId: { variantId, locationId } },
    });
    // 10 de la compra anterior + 5 de esta
    expect(stockItem.quantity).toBe(15);

    const variant = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    expect(variant.costPrice?.toString()).toBe("650");
  });

  it("rechaza una compra sin productos", async () => {
    await expect(
      createPurchaseOrder({ supplierId, locationId, createdById: userId, items: [] })
    ).rejects.toThrow();
  });
});
