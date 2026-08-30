import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getStockValuation, getStockStatusBreakdown } from "@/lib/reports";
import { AnimatedNumber } from "@/components/admin/animated-number";
import { StockStatusBar } from "@/components/admin/stock-status-bar";

export const dynamic = "force-dynamic";

const QUICK_LINKS = [
  { href: "/admin/productos", label: "Productos", desc: "Alta, edición y catálogo" },
  { href: "/admin/stock", label: "Stock", desc: "Existencias por sucursal" },
  { href: "/admin/pedidos", label: "Pedidos", desc: "Online y del local" },
  { href: "/admin/sucursales", label: "Sucursales", desc: "Locales de la marca" },
  { href: "/admin/proveedores", label: "Proveedores", desc: "Contactos de compra" },
  { href: "/admin/compras", label: "Compras", desc: "Ingresos de mercadería" },
  { href: "/admin/envios", label: "Envíos", desc: "Tarifas por peso" },
  { href: "/admin/cupones", label: "Cupones", desc: "Descuentos activos" },
  { href: "/admin/fidelidad", label: "Fidelidad", desc: "Puntos por compra" },
  { href: "/admin/resenas", label: "Reseñas", desc: "Moderación de reseñas" },
  { href: "/admin/apariencia", label: "Apariencia", desc: "Logo, banners y sobre nosotros" },
  { href: "/admin/reportes", label: "Reportes", desc: "Ventas y stock, exportables" },
  { href: "/admin/usuarios", label: "Usuarios", desc: "Roles y accesos" },
];

export default async function AdminDashboardPage() {
  const [productCount, pendingOrders, stockValuation, stockBreakdown] = await Promise.all([
    prisma.product.count({ where: { active: true } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    getStockValuation(),
    getStockStatusBreakdown(),
  ]);

  const stats: { label: string; value: number; kind: "number" | "money" }[] = [
    { label: "Productos activos", value: productCount, kind: "number" },
    { label: "Pedidos pendientes", value: pendingOrders, kind: "number" },
    { label: "Stock valorizado a costo", value: stockValuation.valuedAtCost, kind: "money" },
    { label: "Stock valorizado a precio de venta", value: stockValuation.valuedAtPrice, kind: "money" },
  ];

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-display text-2xl font-bold">Panel</h1>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded border border-border p-4">
              <p className="text-sm text-foreground/70">{stat.label}</p>
              <p className="mt-2 font-display text-3xl tabular-nums">
                <AnimatedNumber value={stat.value} kind={stat.kind} />
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded border border-border p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg">Estado del stock</h2>
          <Link href="/admin/stock" className="text-sm text-accent underline-offset-4 hover:underline">
            Ver stock →
          </Link>
        </div>
        <p className="mt-1 text-sm text-foreground/70">
          Por variante y sucursal ({stockValuation.totalUnits.toLocaleString("es-AR")} unidades en total).
        </p>
        <div className="mt-5">
          <StockStatusBar breakdown={stockBreakdown} />
        </div>
      </div>

      <div>
        <h2 className="font-display text-lg">Accesos rápidos</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded border border-border p-4 transition-colors hover:border-accent"
            >
              <p className="font-display font-medium">{link.label}</p>
              <p className="mt-1 text-sm text-foreground/70">{link.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
