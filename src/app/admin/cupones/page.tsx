import { prisma } from "@/lib/prisma";
import { CouponsPanel } from "@/components/admin/coupons-panel";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <CouponsPanel
      coupons={coupons.map((c) => ({
        ...c,
        amountOff: c.amountOff?.toString() ?? null,
        minOrderTotal: c.minOrderTotal?.toString() ?? null,
        expiresAt: c.expiresAt?.toISOString() ?? null,
      }))}
    />
  );
}
