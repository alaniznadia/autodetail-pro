import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { accruePointsForOrder, redeemPoints, getBalance, LoyaltyError } from "@/lib/loyalty";
import { getStoreSettings, updateStoreSettings, applyFreeShipping } from "@/lib/store-settings";
import type { StoreSettingsValues } from "@/lib/store-settings";

// Tests de integración contra una base Postgres real. StoreSettings es una
// fila única compartida con el resto de la app: se guarda la configuración
// original y se restaura en el afterAll para no dejar el programa de
// fidelidad prendido (o con otros valores) fuera de este archivo de test.

describe("programa de fidelidad", () => {
  let originalSettings: StoreSettingsValues;
  let locationId: string;
  let userId: string;
  let orderId: string;

  beforeAll(async () => {
    originalSettings = await getStoreSettings();
    await updateStoreSettings({
      loyaltyEnabled: true,
      loyaltyArsPerPoint: 100,
      loyaltyPointValue: new Prisma.Decimal(1),
      loyaltyMinRedeem: 10,
    });

    const location = await prisma.location.create({
      data: { name: "Sucursal de test fidelidad" },
    });
    locationId = location.id;

    const user = await prisma.user.create({
      data: { email: `loyalty-${Date.now()}@epicshine.local`, role: "CUSTOMER" },
    });
    userId = user.id;

    const order = await prisma.order.create({
      data: {
        channel: "ONLINE",
        status: "PAID",
        fulfillmentMethod: "STORE_PICKUP",
        locationId,
        customerId: userId,
        subtotal: "1000.00",
        total: "1000.00",
      },
    });
    orderId = order.id;
  });

  afterAll(async () => {
    await prisma.loyaltyMovement.deleteMany({ where: { account: { userId } } });
    await prisma.loyaltyAccount.deleteMany({ where: { userId } });
    await prisma.order.delete({ where: { id: orderId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.location.delete({ where: { id: locationId } });
    await updateStoreSettings(originalSettings);
    await prisma.$disconnect();
  });

  it("acredita puntos una sola vez aunque se acredite dos veces el mismo pedido (webhook repetido)", async () => {
    // $1000 de total a $100/punto = 10 puntos.
    const first = await prisma.$transaction((tx) => accruePointsForOrder(tx, orderId));
    expect(first).toBe(10);

    const second = await prisma.$transaction((tx) => accruePointsForOrder(tx, orderId));
    expect(second).toBeNull();

    const balance = await getBalance(userId);
    expect(balance).toBe(10);
  });

  it("no permite que dos canjes concurrentes dejen el saldo en negativo", async () => {
    await prisma.loyaltyAccount.upsert({
      where: { userId },
      create: { userId, balance: 10 },
      update: { balance: 10 },
    });

    const results = await Promise.allSettled([
      prisma.$transaction((tx) => redeemPoints(tx, userId, 10, "orden-fake-1")),
      prisma.$transaction((tx) => redeemPoints(tx, userId, 10, "orden-fake-2")),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(LoyaltyError);

    const balance = await getBalance(userId);
    expect(balance).toBe(0);
  });

  it("rechaza un canje por debajo del mínimo permitido", async () => {
    await prisma.loyaltyAccount.upsert({
      where: { userId },
      create: { userId, balance: 50 },
      update: { balance: 50 },
    });

    await expect(
      prisma.$transaction((tx) => redeemPoints(tx, userId, 5, "orden-fake-3"))
    ).rejects.toBeInstanceOf(LoyaltyError);

    const balance = await getBalance(userId);
    expect(balance).toBe(50); // no se tocó el saldo
  });
});

describe("applyFreeShipping", () => {
  it("da envío gratis justo al llegar al umbral", () => {
    const result = applyFreeShipping(
      new Prisma.Decimal(500),
      new Prisma.Decimal(10000),
      new Prisma.Decimal(10000)
    );
    expect(result.toString()).toBe("0");
  });

  it("cobra el envío cuando falta un peso para el umbral", () => {
    const result = applyFreeShipping(
      new Prisma.Decimal(500),
      new Prisma.Decimal(9999),
      new Prisma.Decimal(10000)
    );
    expect(result.toString()).toBe("500");
  });

  it("no aplica envío gratis si no hay umbral configurado", () => {
    const result = applyFreeShipping(new Prisma.Decimal(500), new Prisma.Decimal(999999), null);
    expect(result.toString()).toBe("500");
  });
});
