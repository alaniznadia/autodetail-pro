import { prisma } from "@/lib/prisma";
import { ShippingRatesPanel } from "@/components/admin/shipping-rates-panel";

export const dynamic = "force-dynamic";

export default async function AdminShippingPage() {
  const rates = await prisma.shippingRate.findMany({ orderBy: { maxWeightGr: "asc" } });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Envíos</h1>
      <ShippingRatesPanel rates={rates.map((r) => ({ ...r, cost: r.cost.toString() }))} />
    </div>
  );
}
