import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { calculateShippingCost } from "@/lib/shipping";

describe("calculateShippingCost", () => {
  let categoryId: string;
  let productId: string;
  let lightVariantId: string; // 500 g
  let heavyVariantId: string; // sin weightGr cargado (usa el default)
  let testRateIds: string[] = [];
  let previouslyActiveRateIds: string[] = [];

  beforeAll(async () => {
    // calculateShippingCost consulta TODOS los tramos activos, sin
    // scoping por test; para que los tramos de otros entornos (seed) no
    // interfieran con los tramos exactos que arma este test, se
    // desactivan temporalmente y se reactivan en el afterAll.
    const activeRates = await prisma.shippingRate.findMany({ where: { active: true } });
    previouslyActiveRateIds = activeRates.map((r) => r.id);
    await prisma.shippingRate.updateMany({
      where: { id: { in: previouslyActiveRateIds } },
      data: { active: false },
    });

    const [rate1, rate2, rate3, inactiveRate] = await Promise.all([
      prisma.shippingRate.create({
        data: { name: "Hasta 1kg", maxWeightGr: 1000, cost: "1500.00", active: true },
      }),
      prisma.shippingRate.create({
        data: { name: "1kg a 3kg", maxWeightGr: 3000, cost: "2500.00", active: true },
      }),
      prisma.shippingRate.create({
        data: { name: "3kg a 5kg", maxWeightGr: 5000, cost: "3500.00", active: true },
      }),
      prisma.shippingRate.create({
        data: { name: "Tramo barato desactivado", maxWeightGr: 1000, cost: "1.00", active: false },
      }),
    ]);
    testRateIds = [rate1.id, rate2.id, rate3.id, inactiveRate.id];

    const category = await prisma.category.create({
      data: { name: "Test", slug: `test-shipping-${Date.now()}` },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
      data: { name: "Producto de test", slug: `producto-test-shipping-${Date.now()}`, categoryId: category.id },
    });
    productId = product.id;

    const [light, heavy] = await Promise.all([
      prisma.productVariant.create({
        data: {
          productId,
          sku: `SKU-SHIP-LIGHT-${Date.now()}`,
          name: "Liviano",
          price: "1000.00",
          weightGr: 500,
        },
      }),
      prisma.productVariant.create({
        data: { productId, sku: `SKU-SHIP-HEAVY-${Date.now()}`, name: "Sin peso", price: "1000.00" },
      }),
    ]);
    lightVariantId = light.id;
    heavyVariantId = heavy.id;
  });

  afterAll(async () => {
    await prisma.productVariant.deleteMany({ where: { productId } });
    await prisma.product.delete({ where: { id: productId } });
    await prisma.category.delete({ where: { id: categoryId } });
    await prisma.shippingRate.deleteMany({ where: { id: { in: testRateIds } } });
    await prisma.shippingRate.updateMany({
      where: { id: { in: previouslyActiveRateIds } },
      data: { active: true },
    });
    await prisma.$disconnect();
  });

  it("elige el tramo correcto según el peso total del carrito", async () => {
    // 2 x 500g = 1000g -> justo en el límite del primer tramo
    const cost = await calculateShippingCost([{ variantId: lightVariantId, quantity: 2 }]);
    expect(cost.toString()).toBe("1500");
  });

  it("cruza al siguiente tramo al superar el límite del anterior", async () => {
    // 3 x 500g = 1500g -> supera el primer tramo (1000g), entra en el segundo
    const cost = await calculateShippingCost([{ variantId: lightVariantId, quantity: 3 }]);
    expect(cost.toString()).toBe("2500");
  });

  it("usa el tramo más caro en vez de fallar si el peso supera todos los tramos", async () => {
    // 20 x 500g = 10000g -> supera el tramo más pesado (5000g)
    const cost = await calculateShippingCost([{ variantId: lightVariantId, quantity: 20 }]);
    expect(cost.toString()).toBe("3500");
  });

  it("usa un peso por defecto cuando la variante no tiene weightGr cargado", async () => {
    // Sin weightGr, se asume 500g por unidad (mismo default que 1 liviano)
    const costHeavy = await calculateShippingCost([{ variantId: heavyVariantId, quantity: 2 }]);
    const costLight = await calculateShippingCost([{ variantId: lightVariantId, quantity: 2 }]);
    expect(costHeavy.toString()).toBe(costLight.toString());
  });

  it("no considera los tramos desactivados al elegir el más barato", async () => {
    // El tramo desactivado costaría $1 hasta 1000g; si se colara en la
    // selección, este resultado sería $1 en vez de $1500.
    const cost = await calculateShippingCost([{ variantId: lightVariantId, quantity: 1 }]);
    expect(cost.toString()).toBe("1500");
  });
});
