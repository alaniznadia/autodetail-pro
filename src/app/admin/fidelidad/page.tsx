import { getStoreSettings } from "@/lib/store-settings";
import { LoyaltySettingsForm } from "@/components/admin/loyalty-settings-form";

export const dynamic = "force-dynamic";

export default async function AdminLoyaltyPage() {
  const settings = await getStoreSettings();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Puntos Epic Shine</h1>
      <p className="mt-2 max-w-xl text-sm text-foreground/70">
        Programa de fidelidad: los clientes logueados suman puntos al pagar un
        pedido y pueden canjearlos como descuento en el checkout. Arranca
        desactivado.
      </p>
      <div className="mt-6">
        <LoyaltySettingsForm
          initial={{
            loyaltyEnabled: settings.loyaltyEnabled,
            loyaltyArsPerPoint: settings.loyaltyArsPerPoint,
            loyaltyPointValue: settings.loyaltyPointValue.toString(),
            loyaltyMinRedeem: settings.loyaltyMinRedeem,
          }}
        />
      </div>
    </div>
  );
}
