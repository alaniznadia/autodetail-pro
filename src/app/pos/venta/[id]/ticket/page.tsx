import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  MERCADO_PAGO: "Mercado Pago",
  TRANSFER: "Transferencia",
};

export default async function PosSaleTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      location: { select: { name: true } },
      coupon: { select: { code: true } },
      items: { include: { variant: { include: { product: true } } } },
      payments: true,
    },
  });

  if (!order) notFound();

  const cashier = order.soldById
    ? await prisma.user.findUnique({ where: { id: order.soldById }, select: { name: true } })
    : null;

  return (
    <div className="mx-auto max-w-xs p-4 font-mono text-xs print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/pos" className="underline underline-offset-4">
          ← Volver al POS
        </Link>
        <PrintButton />
      </div>

      <div className="text-center">
        <p className="font-display text-base font-bold tracking-widest">EPIC SHINE</p>
        <p>{order.location.name}</p>
        <p>{order.createdAt.toLocaleString("es-AR")}</p>
        <p>Ticket #{order.orderNumber}</p>
        {cashier?.name && <p>Cajero: {cashier.name}</p>}
      </div>

      <div className="mt-3 border-t border-dashed border-foreground/40 pt-2">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between gap-2">
            <span>
              {item.quantity}x {item.variant.product.name} {item.variant.name}
            </span>
            <span>${item.totalPrice.toString()}</span>
          </div>
        ))}
      </div>

      <div className="mt-2 border-t border-dashed border-foreground/40 pt-2">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>${order.subtotal.toString()}</span>
        </div>
        {order.coupon && (
          <div className="flex justify-between">
            <span>Desc. ({order.coupon.code})</span>
            <span>-${order.discountTotal.toString()}</span>
          </div>
        )}
        <div className="mt-1 flex justify-between text-sm font-bold">
          <span>TOTAL</span>
          <span>${order.total.toString()}</span>
        </div>
      </div>

      <div className="mt-2 border-t border-dashed border-foreground/40 pt-2">
        {order.payments.map((p) => (
          <div key={p.id} className="flex justify-between">
            <span>{PAYMENT_METHOD_LABEL[p.method] ?? p.method}</span>
            <span>${p.amount.toString()}</span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-center">Este ticket no tiene valor fiscal.</p>
      <p className="text-center">¡Gracias por tu compra!</p>
    </div>
  );
}
