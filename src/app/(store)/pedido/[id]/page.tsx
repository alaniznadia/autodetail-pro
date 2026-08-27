import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente de pago",
  PAID: "Pagado",
  PREPARING: "En preparación",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  PICKED_UP: "Retirado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

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
    },
  });

  if (!order) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-2xl font-bold">¡Gracias por tu pedido!</h1>
      <p className="mt-2 text-foreground/70">
        Pedido #{order.orderNumber} — estado: {STATUS_LABEL[order.status] ?? order.status}
      </p>

      <ul className="mt-6 divide-y divide-border rounded border border-border">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between p-4 text-sm">
            <span>
              {item.variant.product.name} — {item.variant.name} x{item.quantity}
            </span>
            <span>${item.totalPrice.toString()}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 rounded border border-border p-4 text-sm">
        <p className="flex justify-between">
          <span>Subtotal</span>
          <span>${order.subtotal.toString()}</span>
        </p>
        <p className="flex justify-between">
          <span>Envío</span>
          <span>${order.shippingCost.toString()}</span>
        </p>
        <p className="mt-2 flex justify-between font-display text-lg">
          <span>Total</span>
          <span>${order.total.toString()}</span>
        </p>
      </div>

      <p className="mt-6 text-sm text-foreground/70">
        {order.fulfillmentMethod === "STORE_PICKUP"
          ? "Retirás tu pedido en el local. Te contactaremos por WhatsApp para coordinar."
          : `Enviamos a ${order.address?.street} ${order.address?.number}, ${order.address?.city}. Te contactaremos para coordinar el pago y el envío.`}
      </p>
    </div>
  );
}
