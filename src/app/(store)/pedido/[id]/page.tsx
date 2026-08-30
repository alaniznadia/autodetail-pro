import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { getStoreSettings } from "@/lib/store-settings";
import { getBalance } from "@/lib/loyalty";
import { LoyaltyBalanceCard } from "@/components/store/loyalty-ui";
import { OrderTracking } from "@/components/store/order-tracking";

export const dynamic = "force-dynamic";

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { variant: { include: { product: true } } } },
      address: true,
      payments: true,
      coupon: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) notFound();

  const history = order.statusHistory.reduce<Partial<Record<typeof order.status, Date>>>(
    (acc, h) => ({ ...acc, [h.status]: h.createdAt }),
    {}
  );

  // Solo se muestra si quien mira el pedido es el mismo cliente logueado
  // (un pedido de invitado, o el de otro cliente, no expone el saldo).
  const session = await auth();
  const settings = await getStoreSettings();
  const showLoyalty =
    settings.loyaltyEnabled && order.customerId && order.customerId === session?.user?.id;
  const balance = showLoyalty ? await getBalance(order.customerId!) : 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-[28px] font-medium tracking-[-0.02em]">¡Gracias por tu pedido!</h1>
      <p className="mt-2 text-foreground/85">
        Pedido #{order.orderNumber} — estado: {ORDER_STATUS_LABEL[order.status] ?? order.status}
      </p>

      <div className="mt-8 rounded border border-border p-5">
        <OrderTracking status={order.status} fulfillmentMethod={order.fulfillmentMethod} history={history} />
      </div>

      <ul className="mt-6 divide-y divide-border rounded border border-border">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between p-4 text-[18px]">
            <span>
              {item.variant.product.name} — {item.variant.name} x{item.quantity}
            </span>
            <span>${item.totalPrice.toString()}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 rounded border border-border p-4 text-[18px]">
        <p className="flex justify-between">
          <span>Subtotal</span>
          <span>${order.subtotal.toString()}</span>
        </p>
        <p className="flex justify-between">
          <span>Envío</span>
          <span>${order.shippingCost.toString()}</span>
        </p>
        {order.coupon && (
          <p className="flex justify-between">
            <span>Descuento ({order.coupon.code})</span>
            <span>-${order.discountTotal.toString()}</span>
          </p>
        )}
        <p className="mt-2 flex justify-between text-[22px]">
          <span>Total</span>
          <span>${order.total.toString()}</span>
        </p>
      </div>

      <p className="mt-6 text-[18px] text-foreground/85">
        {order.fulfillmentMethod === "STORE_PICKUP"
          ? "Retirás tu pedido en el local. Te contactaremos por WhatsApp para coordinar."
          : `Enviamos a ${order.address?.street} ${order.address?.number}, ${order.address?.city}. Te contactaremos para coordinar el pago y el envío.`}
      </p>

      {showLoyalty && (
        <div className="mt-6">
          <LoyaltyBalanceCard
            balance={balance}
            nextRewardAt={settings.loyaltyMinRedeem}
            pointValue={Number(settings.loyaltyPointValue)}
          />
        </div>
      )}
    </div>
  );
}
