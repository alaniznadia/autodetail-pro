import { getSalesReport, getStockValuation } from "@/lib/reports";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from: fromParam, to: toParam } = await searchParams;

  const to = toParam ? new Date(`${toParam}T23:59:59`) : new Date();
  const from = fromParam
    ? new Date(`${fromParam}T00:00:00`)
    : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [sales, stock] = await Promise.all([getSalesReport(from, to), getStockValuation()]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Reportes</h1>

      <form className="mt-6 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="from" className="block text-sm">
            Desde
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={formatDate(from)}
            className="mt-1 rounded border border-border bg-background px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="to" className="block text-sm">
            Hasta
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={formatDate(to)}
            className="mt-1 rounded border border-border bg-background px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="rounded border border-accent px-4 py-2 font-display text-sm hover:bg-accent hover:text-background"
        >
          Filtrar
        </button>
      </form>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded border border-border p-4">
          <p className="text-sm text-foreground/60">Ventas totales</p>
          <p className="mt-2 font-display text-2xl">${sales.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="rounded border border-border p-4">
          <p className="text-sm text-foreground/60">Pedidos</p>
          <p className="mt-2 font-display text-2xl">{sales.orderCount}</p>
        </div>
        <div className="rounded border border-border p-4">
          <p className="text-sm text-foreground/60">Ticket promedio</p>
          <p className="mt-2 font-display text-2xl">${sales.averageTicket.toFixed(2)}</p>
        </div>
        <div className="rounded border border-border p-4">
          <p className="text-sm text-foreground/60">Online vs. Local</p>
          <p className="mt-2 font-display text-lg">
            ${sales.onlineRevenue.toFixed(0)} / ${sales.posRevenue.toFixed(0)}
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="font-display text-lg">Productos más vendidos</h2>
          <div className="mt-3 overflow-x-auto rounded border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-foreground/60">
                <tr>
                  <th className="p-3 font-display font-normal">Producto</th>
                  <th className="p-3 font-display font-normal">Cant.</th>
                  <th className="p-3 font-display font-normal">Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {sales.topProducts.map((p) => (
                  <tr key={`${p.name}-${p.variantName}`} className="border-b border-border last:border-0">
                    <td className="p-3">
                      {p.name} — {p.variantName}
                    </td>
                    <td className="p-3">{p.quantity}</td>
                    <td className="p-3">${p.revenue.toFixed(2)}</td>
                  </tr>
                ))}
                {sales.topProducts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-foreground/60">
                      Sin ventas en este período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="font-display text-lg">Stock valorizado</h2>
          <div className="mt-3 rounded border border-border p-4 text-sm">
            <p className="flex justify-between">
              <span>Unidades en stock</span>
              <span>{stock.totalUnits}</span>
            </p>
            <p className="mt-2 flex justify-between">
              <span>Valorizado a costo</span>
              <span>${stock.valuedAtCost.toFixed(2)}</span>
            </p>
            <p className="mt-2 flex justify-between">
              <span>Valorizado a precio de venta</span>
              <span>${stock.valuedAtPrice.toFixed(2)}</span>
            </p>
            <p className="mt-2 flex justify-between text-amber-400">
              <span>Variantes con stock bajo</span>
              <span>{stock.lowStockCount}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
