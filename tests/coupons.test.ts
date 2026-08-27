import { describe, it, expect, afterAll } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { claimCoupon, previewCoupon, InvalidCouponError } from "@/lib/coupons";

describe("cupones", () => {
  const codes: string[] = [];

  async function makeCoupon(data: Partial<Prisma.CouponCreateInput> & { code: string }) {
    codes.push(data.code);
    return prisma.coupon.create({ data: data as Prisma.CouponCreateInput });
  }

  afterAll(async () => {
    await prisma.coupon.deleteMany({ where: { code: { in: codes } } });
    await prisma.$disconnect();
  });

  it("calcula el descuento por porcentaje", async () => {
    await makeCoupon({ code: `PCT10-${Date.now()}`, percentOff: 10 });
    const coupon = codes[codes.length - 1];
    const { discountTotal } = await previewCoupon(coupon, new Prisma.Decimal(1000));
    expect(discountTotal.toString()).toBe("100");
  });

  it("no descuenta más que el subtotal", async () => {
    await makeCoupon({ code: `AMT-${Date.now()}`, amountOff: "5000.00" });
    const coupon = codes[codes.length - 1];
    const { discountTotal } = await previewCoupon(coupon, new Prisma.Decimal(1000));
    expect(discountTotal.toString()).toBe("1000");
  });

  it("rechaza si no llega a la compra mínima", async () => {
    await makeCoupon({
      code: `MIN-${Date.now()}`,
      percentOff: 10,
      minOrderTotal: "2000.00",
    });
    const coupon = codes[codes.length - 1];
    await expect(previewCoupon(coupon, new Prisma.Decimal(1000))).rejects.toBeInstanceOf(
      InvalidCouponError
    );
  });

  it("rechaza un cupón vencido", async () => {
    await makeCoupon({
      code: `EXP-${Date.now()}`,
      percentOff: 10,
      expiresAt: new Date(Date.now() - 86_400_000),
    });
    const coupon = codes[codes.length - 1];
    await expect(previewCoupon(coupon, new Prisma.Decimal(1000))).rejects.toBeInstanceOf(
      InvalidCouponError
    );
  });

  it("no permite usar un cupón más veces que su límite", async () => {
    await makeCoupon({ code: `ONCE-${Date.now()}`, percentOff: 10, maxUses: 1 });
    const coupon = codes[codes.length - 1];

    await prisma.$transaction((tx) => claimCoupon(tx, coupon, new Prisma.Decimal(1000)));

    await expect(
      prisma.$transaction((tx) => claimCoupon(tx, coupon, new Prisma.Decimal(1000)))
    ).rejects.toBeInstanceOf(InvalidCouponError);
  });

  it("no permite que dos usos simultáneos superen el límite", async () => {
    await makeCoupon({ code: `RACE-${Date.now()}`, percentOff: 10, maxUses: 1 });
    const coupon = codes[codes.length - 1];

    const results = await Promise.allSettled([
      prisma.$transaction((tx) => claimCoupon(tx, coupon, new Prisma.Decimal(1000))),
      prisma.$transaction((tx) => claimCoupon(tx, coupon, new Prisma.Decimal(1000))),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const final = await prisma.coupon.findFirstOrThrow({ where: { code: coupon } });
    expect(final.usedCount).toBe(1);
  });
});
