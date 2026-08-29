import { prisma } from "@/lib/prisma";
import { ShippingRatesPanel } from "@/components/admin/shipping-rates-panel";
import { FreeShippingForm } from "@/components/admin/free-shipping-form";
import { getStoreSettings } from "@/lib/store-settings";

export const dynamic = "force-dynamic";

export default async function AdminShippingPage() {
  const [rates, settings] = await Promise.all([
    prisma.shippingRate.findMany({ orderBy: { maxWeightGr: "asc" } }),
    getStoreSettings(),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-display text-2xl font-bold">Envíos</h1>
        <ShippingRatesPanel rates={rates.map((r) => ({ ...r, cost: r.cost.toString() }))} />
      </div>

      <section>
        <h2 className="font-display text-lg">Envío gratis</h2>
        <div className="mt-4">
          <FreeShippingForm initial={settings.freeShippingFrom?.toString() ?? null} />
        </div>
      </section>
    </div>
  );
}
