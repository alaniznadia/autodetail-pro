import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { computeManualDiscountAmount } from "@/lib/discount";

// Lógica pura (no toca la base), ya se ejercita indirectamente a través de
// createPosSale en sales.test.ts; este archivo la prueba de forma directa.
describe("computeManualDiscountAmount", () => {
  it("calcula un descuento porcentual sobre el subtotal", () => {
    const result = computeManualDiscountAmount(new Prisma.Decimal(1000), {
      type: "PERCENT",
      value: 15,
    });
    expect(result.toString()).toBe("150");
  });

  it("usa el monto fijo tal cual, sin importar el subtotal", () => {
    const result = computeManualDiscountAmount(new Prisma.Decimal(1000), {
      type: "AMOUNT",
      value: 200,
    });
    expect(result.toString()).toBe("200");
  });

  it("un 0% no descuenta nada", () => {
    const result = computeManualDiscountAmount(new Prisma.Decimal(1000), {
      type: "PERCENT",
      value: 0,
    });
    expect(result.toString()).toBe("0");
  });
});
