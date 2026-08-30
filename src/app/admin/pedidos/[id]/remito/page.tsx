import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

export default async function OrderPackingSlipPage({
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
      location: { select: { name: true, address: true } },
      coupon: { select: { code: true } },
      items: { include: { variant: { include: { product: true } } } },
    },
  });

  if (!order) notFound();

  const customerName = order.customer?.name ?? order.guestName ?? "—";
  const customerEmail = order.customer?.email ?? order.guestEmail;
  const customerPhone = order.customer?.phone ?? order.guestPhone;

  return (
    <div className="mx-auto max-w-2xl p-6 print:p-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href={`/admin/pedidos/${order.id}`} className="text-sm underline underline-offset-4">
          ← Volver al pedido
        </Link>
        <PrintButton />
      </div>

      <header className="flex items-start justify-between border-b border-border pb-4">
        <div>
          <p className="font-display text-xl font-bold tracking-widest">Epic Shine</p>
          <p className="text-sm text-foreground/70">{order.location.name}</p>
          {order.location.address && (
            <p className="text-sm text-foreground/70">{order.location.address}</p>
          )}
        </div>
        <div className="text-right">
          <p className="font-display text-lg">Remito — Pedido #{order.orderNumber}</p>
          <p className="text-sm text-foreground/70">{order.createdAt.toLocaleDateString("es-AR")}</p>
        </div>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <h2 className="font-display text-sm text-foreground/60">Cliente</h2>
          <p className="mt-1">{customerName}</p>
          <p className="text-sm text-foreground/70">{customerEmail}</p>
          {customerPhone && <p className="text-sm text-foreground/70">{customerPhone}</p>}
        </div>
        <div>
          <h2 className="font-display text-sm text-foreground/60">Entrega</h2>
          {order.fulfillmentMethod === "STORE_PICKUP" ? (
            <p className="mt-1">Retiro en el local</p>
          ) : (
            <p className="mt-1">
              {order.address?.street} {order.address?.number}
              {order.address?.floorApt ? `, ${order.address.floorApt}` : ""}
              <br />
              {order.address?.city}, {order.address?.province} ({order.address?.postalCode})
            </p>
          )}
        </div>
      </section>

      <table className="mt-8 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-foreground/40 text-left">
            <th className="py-2 font-display font-normal">Producto</th>
            <th className="py-2 text-right font-display font-normal">Cant.</th>
            <th className="py-2 text-right font-display font-normal">P. unit.</th>
            <th className="py-2 text-right font-display font-normal">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} className="border-b border-border">
              <td className="py-2">
                {item.variant.product.name} — {item.variant.name}
              </td>
              <td className="py-2 text-right">{item.quantity}</td>
              <td className="py-2 text-right">${item.unitPrice.toString()}</td>
              <td className="py-2 text-right">${item.totalPrice.toString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 ml-auto max-w-xs text-sm">
        <p className="flex justify-between">
          <span>Subtotal</span>
          <span>${order.subtotal.toString()}</span>
        </p>
        {order.fulfillmentMethod === "SHIPPING" && (
          <p className="flex justify-between">
            <span>Envío (referencia, se cobra aparte)</span>
            <span>${order.shippingCost.toString()}</span>
          </p>
        )}
        {order.coupon && (
          <p className="flex justify-between">
            <span>Descuento ({order.coupon.code})</span>
            <span>-${order.discountTotal.toString()}</span>
          </p>
        )}
        <p className="mt-2 flex justify-between border-t border-foreground/40 pt-2 font-display text-lg">
          <span>Total</span>
          <span>${order.total.toString()}</span>
        </p>
      </div>

      <p className="mt-10 text-center text-xs text-foreground/60">
        Este remito no tiene valor fiscal. Gracias por elegir Epic Shine.
      </p>
    </div>
  );
}
