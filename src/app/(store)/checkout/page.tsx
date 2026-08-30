import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStoreSettings } from "@/lib/store-settings";
import { getBalance } from "@/lib/loyalty";
import { CheckoutForm } from "./checkout-form";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const session = await auth();
  const settings = await getStoreSettings();
  const balance = session?.user?.id ? await getBalance(session.user.id) : 0;

  // Cada pedido con envío guarda su propia Address (ver lib/orders.ts), así
  // que la más reciente del usuario ya sirve como "última dirección usada"
  // sin necesidad de un mecanismo de guardado aparte.
  const lastAddress = session?.user?.id
    ? await prisma.address.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
      })
    : null;

  return (
    <CheckoutForm
      loyaltyEnabled={settings.loyaltyEnabled}
      loyaltyBalance={balance}
      loyaltyPointValue={Number(settings.loyaltyPointValue)}
      loyaltyMinRedeem={settings.loyaltyMinRedeem}
      isLoggedIn={Boolean(session?.user?.id)}
      initialAddress={
        lastAddress
          ? {
              street: lastAddress.street,
              number: lastAddress.number,
              floorApt: lastAddress.floorApt ?? "",
              city: lastAddress.city,
              province: lastAddress.province,
              postalCode: lastAddress.postalCode,
            }
          : undefined
      }
    />
  );
}
