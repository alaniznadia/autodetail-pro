import Link from "next/link";
import { getSalesReport, getStockValuation, getStockStatusBreakdown } from "@/lib/reports";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return date.toLocaleDateString("es-AR");
}

const money = (n: number) => "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 2 });

export default async function PrintableReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from: fromParam, to: toParam } = await searchParams;

  const to = toParam ? new Date(`${toParam}T23:59:59`) : new Date();
  const from = fromParam
    ? new Date(`${fromParam}T00:00:00`)
    : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [sales, stock, breakdown] = await Promise.all([
    getSalesReport(from, to),
    getStockValuation(),
    getStockStatusBreakdown(),
  ]);

  return (
    <div className="mx-auto max-w-3xl p-6 print:p-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href="/admin/reportes" className="text-sm underline underline-offset-4">
          ← Volver a reportes
        </Link>
        <PrintButton />
      </div>

      <header className="flex items-start justify-between border-b border-border pb-4">
        <div>
          <p className="font-display text-xl font-bold tracking-widest">Epic Shine</p>
          <p className="text-sm text-foreground/70">Reporte de ventas y stock</p>
        </div>
        <div className="text-right">
          <p className="font-display text-lg">
            {formatDate(from)} – {formatDate(to)}
          </p>
          <p className="text-sm text-foreground/70">Emitido el {formatDate(new Date())}</p>
        </div>
      </header>

      <section className="mt-6">
        <h2 className="font-display text-sm text-foreground/60">Resumen de ventas</h2>
        <table className="mt-2 w-full border-collapse text-sm">
          <tbody>
            <tr className="border-b border-border">
              <td className="py-1.5">Ventas totales</td>
              <td className="py-1.5 text-right font-medium">{money(sales.totalRevenue)}</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-1.5">Pedidos</td>
              <td className="py-1.5 text-right font-medium">{sales.orderCount}</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-1.5">Ticket promedio</td>
              <td className="py-1.5 text-right font-medium">{money(sales.averageTicket)}</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-1.5">Ventas online</td>
              <td className="py-1.5 text-right font-medium">{money(sales.onlineRevenue)}</td>
            </tr>
            <tr>
              <td className="py-1.5">Ventas en local (POS)</td>
              <td className="py-1.5 text-right font-medium">{money(sales.posRevenue)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-sm text-foreground/60">Productos más vendidos</h2>
        <table className="mt-2 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-foreground/40 text-left">
              <th className="py-2 font-display font-normal">Producto</th>
              <th className="py-2 text-right font-display font-normal">Cant.</th>
              <th className="py-2 text-right font-display font-normal">Ingresos</th>
            </tr>
          </thead>
          <tbody>
            {sales.topProducts.map((p) => (
              <tr key={`${p.name}-${p.variantName}`} className="border-b border-border">
                <td className="py-1.5">
                  {p.name} — {p.variantName}
                </td>
                <td className="py-1.5 text-right">{p.quantity}</td>
                <td className="py-1.5 text-right">{money(p.revenue)}</td>
              </tr>
            ))}
            {sales.topProducts.length === 0 && (
              <tr>
                <td colSpan={3} className="py-3 text-center text-foreground/60">
                  Sin ventas en este período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="font-display text-sm text-foreground/60">Stock valorizado</h2>
          <table className="mt-2 w-full border-collapse text-sm">
            <tbody>
              <tr className="border-b border-border">
                <td className="py-1.5">Unidades en stock</td>
                <td className="py-1.5 text-right font-medium">{stock.totalUnits}</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-1.5">Valorizado a costo</td>
                <td className="py-1.5 text-right font-medium">{money(stock.valuedAtCost)}</td>
              </tr>
              <tr>
                <td className="py-1.5">Valorizado a precio de venta</td>
                <td className="py-1.5 text-right font-medium">{money(stock.valuedAtPrice)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="font-display text-sm text-foreground/60">
            Estado del stock (variante × sucursal)
          </h2>
          <table className="mt-2 w-full border-collapse text-sm">
            <tbody>
              <tr className="border-b border-border">
                <td className="py-1.5">Disponible</td>
                <td className="py-1.5 text-right font-medium">{breakdown.disponible}</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-1.5">Mínimo</td>
                <td className="py-1.5 text-right font-medium">{breakdown.minimo}</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-1.5">Agotado</td>
                <td className="py-1.5 text-right font-medium">{breakdown.agotado}</td>
              </tr>
              <tr>
                <td className="py-1.5">Sin control de stock</td>
                <td className="py-1.5 text-right font-medium">{breakdown.sinControl}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-10 text-center text-xs text-foreground/60">
        Reporte interno de Epic Shine. Sin valor fiscal.
      </p>
    </div>
  );
}
