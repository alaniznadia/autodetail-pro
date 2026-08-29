import { getStoreSettings } from "@/lib/store-settings";
import { CartView } from "@/components/store/cart-view";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const settings = await getStoreSettings();

  return (
    <CartView
      freeShippingFrom={settings.freeShippingFrom ? Number(settings.freeShippingFrom) : null}
      loyaltyEnabled={settings.loyaltyEnabled}
      loyaltyArsPerPoint={settings.loyaltyArsPerPoint}
    />
  );
}
