import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { OrderStatusSelect } from "@/components/admin/order-status-select";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { customer: { select: { name: true, email: true } } },
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Pedidos</h1>
      <div className="mt-6 overflow-x-auto rounded border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border text-foreground/60">
            <tr>
              <th className="p-3 font-display font-normal">#</th>
              <th className="p-3 font-display font-normal">Canal</th>
              <th className="p-3 font-display font-normal">Cliente</th>
              <th className="p-3 font-display font-normal">Total</th>
              <th className="p-3 font-display font-normal">Fecha</th>
              <th className="p-3 font-display font-normal">Estado</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0">
                <td className="p-3">
                  <Link href={`/admin/pedidos/${o.id}`} className="underline underline-offset-4">
                    {o.orderNumber}
                  </Link>
                </td>
                <td className="p-3">{o.channel === "ONLINE" ? "Online" : "Local"}</td>
                <td className="p-3">{o.customer?.name ?? o.guestName ?? "—"}</td>
                <td className="p-3">${o.total.toString()}</td>
                <td className="p-3">{o.createdAt.toLocaleString("es-AR")}</td>
                <td className="p-3">
                  <OrderStatusSelect orderId={o.id} status={o.status} />
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-foreground/60">
                  Todavía no hay pedidos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
