import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const [productCount, lowStockRows, pendingOrders] = await Promise.all([
    prisma.product.count({ where: { active: true } }),
    prisma.$queryRaw<
      { count: bigint }[]
    >`SELECT COUNT(*)::bigint as count FROM "StockItem" WHERE quantity <= "lowStockAlert"`,
    prisma.order.count({ where: { status: "PENDING" } }),
  ]);

  const lowStockCount = Number(lowStockRows[0]?.count ?? 0);

  const stats = [
    { label: "Productos activos", value: productCount },
    { label: "Pedidos pendientes", value: pendingOrders },
    { label: "Alertas de stock bajo", value: lowStockCount },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Panel</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded border border-border p-4">
            <p className="text-sm text-foreground/60">{stat.label}</p>
            <p className="mt-2 font-display text-3xl">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
