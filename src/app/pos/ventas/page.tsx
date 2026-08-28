import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/order-status";

export const dynamic = "force-dynamic";

export default async function PosSalesPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      customer: { select: { name: true, email: true } },
      payments: { select: { method: true } },
    },
  });

  // soldById no tiene relación en el schema (ver ticket/page.tsx, mismo
  // patrón): se busca aparte y se arma un mapa id -> nombre.
  const soldByIds = [...new Set(orders.map((o) => o.soldById).filter((id) => id !== null))];
  const sellers = soldByIds.length
    ? await prisma.user.findMany({ where: { id: { in: soldByIds } }, select: { id: true, name: true } })
    : [];
  const sellerNameById = new Map(sellers.map((s) => [s.id, s.name]));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Ventas</h1>
      <p className="mt-2 max-w-xl text-sm text-foreground/70">
        Todas las ventas, tanto del catálogo online como del local (POS).
      </p>

      <div className="mt-6 overflow-x-auto rounded border border-border">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-border text-foreground/60">
            <tr>
              <th className="p-3 font-display font-normal">#</th>
              <th className="p-3 font-display font-normal">Canal</th>
              <th className="p-3 font-display font-normal">Cliente</th>
              <th className="p-3 font-display font-normal">Vendedor</th>
              <th className="p-3 font-display font-normal">Pago</th>
              <th className="p-3 font-display font-normal">Total</th>
              <th className="p-3 font-display font-normal">Fecha</th>
              <th className="p-3 font-display font-normal">Estado</th>
              <th className="p-3 font-display font-normal">Comprobante</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0">
                <td className="p-3">{o.orderNumber}</td>
                <td className="p-3">{o.channel === "ONLINE" ? "Catálogo" : "Local"}</td>
                <td className="p-3">{o.customer?.name ?? o.guestName ?? "—"}</td>
                <td className="p-3">
                  {o.soldById ? sellerNameById.get(o.soldById) ?? "—" : "—"}
                </td>
                <td className="p-3">
                  {o.payments.map((p) => PAYMENT_METHOD_LABEL[p.method] ?? p.method).join(", ") ||
                    "—"}
                </td>
                <td className="p-3">${o.total.toString()}</td>
                <td className="p-3">{o.createdAt.toLocaleString("es-AR")}</td>
                <td className="p-3">{ORDER_STATUS_LABEL[o.status] ?? o.status}</td>
                <td className="p-3">
                  <Link
                    href={`/pos/venta/${o.id}/ticket`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4"
                  >
                    Generar
                  </Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={9} className="p-4 text-center text-foreground/60">
                  Todavía no hay ventas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
