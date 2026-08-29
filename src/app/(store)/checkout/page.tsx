import { auth } from "@/lib/auth";
import { getStoreSettings } from "@/lib/store-settings";
import { getBalance } from "@/lib/loyalty";
import { CheckoutForm } from "./checkout-form";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const session = await auth();
  const settings = await getStoreSettings();
  const balance = session?.user?.id ? await getBalance(session.user.id) : 0;

  return (
    <CheckoutForm
      loyaltyEnabled={settings.loyaltyEnabled}
      loyaltyBalance={balance}
      loyaltyPointValue={Number(settings.loyaltyPointValue)}
      loyaltyMinRedeem={settings.loyaltyMinRedeem}
      isLoggedIn={Boolean(session?.user?.id)}
    />
  );
}
