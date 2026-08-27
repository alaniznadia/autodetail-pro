import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MOVEMENT_LABELS: Record<string, string> = {
  SALE_ONLINE: "Venta online",
  SALE_POS: "Venta local",
  PURCHASE_IN: "Ingreso por compra",
  ADJUSTMENT: "Ajuste",
  RETURN_IN: "Devolución de cliente",
  RETURN_OUT: "Devolución a proveedor",
  TRANSFER: "Transferencia",
};

export default async function AdminStockPage() {
  const [stockItems, movements] = await Promise.all([
    prisma.stockItem.findMany({
      include: { variant: { include: { product: true } }, location: true },
      orderBy: { quantity: "asc" },
    }),
    prisma.stockMovement.findMany({
      include: { variant: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Stock</h1>

      <h2 className="mt-8 font-display text-lg">Stock actual</h2>
      <div className="mt-3 overflow-x-auto rounded border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-border text-foreground/60">
            <tr>
              <th className="p-3 font-display font-normal">Producto</th>
              <th className="p-3 font-display font-normal">Sucursal</th>
              <th className="p-3 font-display font-normal">Cantidad</th>
              <th className="p-3 font-display font-normal">Alerta</th>
            </tr>
          </thead>
          <tbody>
            {stockItems.map((item) => (
              <tr
                key={item.id}
                className={`border-b border-border last:border-0 ${
                  item.quantity <= item.lowStockAlert ? "text-amber-400" : ""
                }`}
              >
                <td className="p-3">
                  {item.variant.product.name} — {item.variant.name}
                </td>
                <td className="p-3">{item.location.name}</td>
                <td className="p-3">{item.quantity}</td>
                <td className="p-3">{item.lowStockAlert}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 font-display text-lg">Movimientos recientes</h2>
      <div className="mt-3 overflow-x-auto rounded border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border text-foreground/60">
            <tr>
              <th className="p-3 font-display font-normal">Producto</th>
              <th className="p-3 font-display font-normal">Tipo</th>
              <th className="p-3 font-display font-normal">Cantidad</th>
              <th className="p-3 font-display font-normal">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id} className="border-b border-border last:border-0">
                <td className="p-3">
                  {m.variant.product.name} — {m.variant.name}
                </td>
                <td className="p-3">{MOVEMENT_LABELS[m.type] ?? m.type}</td>
                <td className="p-3">{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                <td className="p-3">{m.createdAt.toLocaleString("es-AR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
