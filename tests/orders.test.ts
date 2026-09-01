import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createOnlineOrder } from "@/lib/orders";
import { InsufficientStockError } from "@/lib/errors";
import { InvalidCouponError } from "@/lib/coupons";
import { updateStoreSettings, getStoreSettings } from "@/lib/store-settings";
import type { StoreSettingsValues } from "@/lib/store-settings";

// Tests de integración contra una base Postgres real. createOnlineOrder es
// la función más crítica de la tienda: compone stock, cupón, envío y
// puntos de fidelidad en una sola transacción atómica. StoreSettings es
// una fila única compartida con el resto de la app (mismo cuidado que en
// loyalty.test.ts): se guarda y se restaura en el afterAll.

describe("createOnlineOrder", () => {
  let originalSettings: StoreSettingsValues;
  let locationId: string;
  let categoryId: string;
  let productId: string;
  let variantId: string;
  let couponId: string;
  let shippingRateId: string;
  const orderIds: string[] = [];

  beforeAll(async () => {
    originalSettings = await getStoreSettings();

    const location = await prisma.location.create({ data: { name: "Sucursal de test pedidos" } });
    locationId = location.id;

    const category = await prisma.category.create({
      data: { name: "Test", slug: `test-orders-${Date.now()}` },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
      data: {
        name: "Producto de test pedidos",
        slug: `producto-test-orders-${Date.now()}`,
        categoryId,
      },
    });
    productId = product.id;

    const variant = await prisma.productVariant.create({
      data: {
        productId,
        sku: `SKU-ORDERS-${Date.now()}`,
        name: "Único",
        price: "1000.00",
        weightGr: 500,
      },
    });
    variantId = variant.id;

    await prisma.stockItem.create({ data: { variantId, locationId, quantity: 10 } });

    const coupon = await prisma.coupon.create({
      data: { code: `ORDERSTEST-${Date.now()}`, percentOff: 10 },
    });
    couponId = coupon.id;

    // calculateShippingCost() lanza si no hay ninguna tarifa activa; esto
    // es solo una red de seguridad para ese caso (una base de test vacía,
    // sin seed). A propósito NO se tocan/desactivan las tarifas que ya
    // pueda haber: shipping.test.ts corre en paralelo contra la misma
    // base y hace ese mismo manejo con las suyas — deactivar acá las de
    // otro test de forma concurrente los hace interferir entre sí. Por
    // eso el test de abajo no afirma un monto exacto de envío.
    const shippingRate = await prisma.shippingRate.create({
      data: { name: `Test-${Date.now()}`, maxWeightGr: 999_000_000, cost: "500.00" },
    });
    shippingRateId = shippingRate.id;
  });

  afterAll(async () => {
    await prisma.stockMovement.deleteMany({ where: { locationId } });
    await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.loyaltyMovement.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.coupon.delete({ where: { id: couponId } });
    await prisma.stockItem.deleteMany({ where: { locationId } });
    await prisma.productVariant.delete({ where: { id: variantId } });
    await prisma.product.delete({ where: { id: productId } });
    await prisma.category.delete({ where: { id: categoryId } });
    await prisma.shippingRate.delete({ where: { id: shippingRateId } });
    await prisma.location.delete({ where: { id: locationId } });
    await updateStoreSettings(originalSettings);
    await prisma.$disconnect();
  });

  function baseInput(overrides: Partial<Parameters<typeof createOnlineOrder>[0]> = {}) {
    return {
      locationId,
      items: [{ variantId, quantity: 1 }],
      fulfillmentMethod: "STORE_PICKUP" as const,
      paymentMethod: "MERCADO_PAGO" as const,
      guestName: "Cliente de prueba",
      guestEmail: `cliente-${Date.now()}-${Math.random()}@epicshine.local`,
      guestPhone: "1123456789",
      ...overrides,
    };
  }

  it("descuenta stock y crea el pedido en PENDING", async () => {
    const order = await createOnlineOrder(baseInput());
    orderIds.push(order.id);

    expect(order.status).toBe("PENDING");
    expect(order.channel).toBe("ONLINE");
    expect(Number(order.total)).toBe(1000);

    const stock = await prisma.stockItem.findUniqueOrThrow({
      where: { variantId_locationId: { variantId, locationId } },
    });
    expect(stock.quantity).toBe(9);
  });

  it("rechaza el pedido si no hay stock suficiente y no descuenta nada", async () => {
    const stockBefore = await prisma.stockItem.findUniqueOrThrow({
      where: { variantId_locationId: { variantId, locationId } },
    });

    await expect(
      createOnlineOrder(baseInput({ items: [{ variantId, quantity: 999 }] }))
    ).rejects.toBeInstanceOf(InsufficientStockError);

    const stockAfter = await prisma.stockItem.findUniqueOrThrow({
      where: { variantId_locationId: { variantId, locationId } },
    });
    expect(stockAfter.quantity).toBe(stockBefore.quantity);
  });

  it("aplica un cupón válido al subtotal", async () => {
    const order = await createOnlineOrder(
      baseInput({ couponCode: (await prisma.coupon.findUniqueOrThrow({ where: { id: couponId } })).code })
    );
    orderIds.push(order.id);

    expect(Number(order.subtotal)).toBe(1000);
    expect(Number(order.discountTotal)).toBe(100);
    expect(Number(order.total)).toBe(900);
  });

  it("rechaza un código de cupón inexistente sin crear el pedido ni tocar el stock", async () => {
    const stockBefore = await prisma.stockItem.findUniqueOrThrow({
      where: { variantId_locationId: { variantId, locationId } },
    });

    await expect(
      createOnlineOrder(baseInput({ couponCode: "NO-EXISTE-ESTE-CODIGO" }))
    ).rejects.toBeInstanceOf(InvalidCouponError);

    const stockAfter = await prisma.stockItem.findUniqueOrThrow({
      where: { variantId_locationId: { variantId, locationId } },
    });
    expect(stockAfter.quantity).toBe(stockBefore.quantity);
  });

  it("con envío a domicilio, el costo de envío queda como referencia pero no se cobra en el total", async () => {
    const order = await createOnlineOrder(baseInput({ fulfillmentMethod: "SHIPPING" }));
    orderIds.push(order.id);

    // No se afirma un monto exacto: qué tramo de ShippingRate gana depende
    // de qué otras tarifas activas haya en la base en este momento
    // (compartida con shipping.test.ts). Lo que importa acá es que haya
    // quedado una referencia, y que el total cobrado por Mercado Pago sea
    // solo el producto: el envío se coordina y se cobra aparte por
    // WhatsApp (ver lib/orders.ts).
    expect(Number(order.shippingCost)).toBeGreaterThan(0);
    expect(Number(order.total)).toBe(1000);
  });

  it("no duplica el pedido si se reintenta con la misma idempotencyKey", async () => {
    const idempotencyKey = `test-idem-${Date.now()}`;

    const first = await createOnlineOrder(baseInput({ idempotencyKey }));
    orderIds.push(first.id);
    const second = await createOnlineOrder(baseInput({ idempotencyKey }));

    expect(second.id).toBe(first.id);

    const count = await prisma.order.count({ where: { idempotencyKey } });
    expect(count).toBe(1);
  });

  it("descuenta puntos de fidelidad del total cuando el cliente canjea", async () => {
    await updateStoreSettings({
      loyaltyEnabled: true,
      loyaltyArsPerPoint: 100,
      loyaltyPointValue: new Prisma.Decimal(1),
      loyaltyMinRedeem: 1,
    });

    const user = await prisma.user.create({
      data: { email: `orders-loyalty-${Date.now()}@epicshine.local`, role: "CUSTOMER" },
    });
    await prisma.loyaltyAccount.create({ data: { userId: user.id, balance: 50 } });

    try {
      const order = await createOnlineOrder(
        baseInput({ customerId: user.id, pointsToRedeem: 50 })
      );
      orderIds.push(order.id);

      // $1000 de subtotal - 50 puntos * $1 = $950.
      expect(Number(order.total)).toBe(950);
      expect(order.pointsRedeemed).toBe(50);
    } finally {
      await prisma.loyaltyMovement.deleteMany({ where: { account: { userId: user.id } } });
      await prisma.loyaltyAccount.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  });
});
