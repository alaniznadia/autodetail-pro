import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPurchasesPage() {
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    include: {
      supplier: { select: { name: true } },
      items: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Compras</h1>
        <Link
          href="/admin/compras/nueva"
          className="rounded border border-accent px-4 py-2 font-display text-sm hover:bg-accent hover:text-background"
        >
          + Nueva compra
        </Link>
      </div>

      <div className="mt-8 overflow-x-auto rounded border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-border text-foreground/60">
            <tr>
              <th className="p-3 font-display font-normal">Proveedor</th>
              <th className="p-3 font-display font-normal">Ítems</th>
              <th className="p-3 font-display font-normal">Total costo</th>
              <th className="p-3 font-display font-normal">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrders.map((po) => {
              const totalCost = po.items.reduce(
                (sum, item) => sum + Number(item.unitCost) * item.quantity,
                0
              );
              return (
                <tr key={po.id} className="border-b border-border last:border-0">
                  <td className="p-3">{po.supplier.name}</td>
                  <td className="p-3">{po.items.length}</td>
                  <td className="p-3">${totalCost.toFixed(2)}</td>
                  <td className="p-3">{po.createdAt.toLocaleString("es-AR")}</td>
                </tr>
              );
            })}
            {purchaseOrders.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-foreground/60">
                  Todavía no registraste ninguna compra.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
