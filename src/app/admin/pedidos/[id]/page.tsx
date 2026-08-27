import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OrderStatusSelect } from "@/components/admin/order-status-select";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";

export const dynamic = "force-dynamic";

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CARD: "Tarjeta",
  MERCADO_PAGO: "Mercado Pago",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  REFUNDED: "Reembolsado",
  CANCELLED: "Cancelado",
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      address: true,
      location: { select: { name: true } },
      coupon: { select: { code: true } },
      items: { include: { variant: { include: { product: true } } } },
      payments: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) notFound();

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Pedido #{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-foreground/60">
            {order.channel === "ONLINE" ? "Online" : "Local (POS)"} —{" "}
            {order.createdAt.toLocaleString("es-AR")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <OrderStatusSelect orderId={order.id} status={order.status} />
          <Link
            href={`/admin/pedidos/${order.id}/remito`}
            className="rounded border border-accent px-4 py-2 font-display text-sm hover:bg-accent hover:text-background"
          >
            Imprimir remito
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="font-display text-sm text-foreground/60">Cliente</h2>
          <p className="mt-1">{order.customer?.name ?? order.guestName ?? "—"}</p>
          <p className="text-sm text-foreground/70">{order.customer?.email ?? order.guestEmail}</p>
          <p className="text-sm text-foreground/70">
            {order.customer?.phone ?? order.guestPhone ?? "—"}
          </p>
        </div>
        <div>
          <h2 className="font-display text-sm text-foreground/60">Entrega</h2>
          <p className="mt-1">
            {order.fulfillmentMethod === "STORE_PICKUP"
              ? `Retiro en el local (${order.location.name})`
              : "Envío a domicilio"}
          </p>
          {order.address && (
            <p className="text-sm text-foreground/70">
              {order.address.street} {order.address.number}
              {order.address.floorApt ? `, ${order.address.floorApt}` : ""}, {order.address.city},{" "}
              {order.address.province} ({order.address.postalCode})
            </p>
          )}
          {order.trackingCode && (
            <p className="text-sm text-foreground/70">Seguimiento: {order.trackingCode}</p>
          )}
        </div>
      </section>

      <h2 className="mt-8 font-display text-lg">Productos</h2>
      <ul className="mt-3 divide-y divide-border rounded border border-border">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between p-3 text-sm">
            <span>
              {item.variant.product.name} — {item.variant.name} x{item.quantity}
            </span>
            <span>${item.totalPrice.toString()}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 max-w-sm rounded border border-border p-4 text-sm">
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
        <p className="mt-2 flex justify-between font-display text-lg">
          <span>Total</span>
          <span>${order.total.toString()}</span>
        </p>
      </div>

      <h2 className="mt-8 font-display text-lg">Pagos</h2>
      <ul className="mt-3 divide-y divide-border rounded border border-border">
        {order.payments.map((p) => (
          <li key={p.id} className="flex justify-between p-3 text-sm">
            <span>
              {PAYMENT_METHOD_LABEL[p.method] ?? p.method} —{" "}
              {PAYMENT_STATUS_LABEL[p.status] ?? p.status}
            </span>
            <span>${p.amount.toString()}</span>
          </li>
        ))}
      </ul>

      <h2 className="mt-8 font-display text-lg">Historial de estados</h2>
      <ul className="mt-3 divide-y divide-border rounded border border-border text-sm">
        {order.statusHistory.map((h) => (
          <li key={h.id} className="flex justify-between p-3">
            <span>
              {ORDER_STATUS_LABEL[h.status] ?? h.status}
              {h.note ? ` — ${h.note}` : ""}
            </span>
            <span className="text-foreground/60">{h.createdAt.toLocaleString("es-AR")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
