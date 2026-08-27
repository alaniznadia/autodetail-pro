import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    include: {
      category: { select: { name: true } },
      variants: { include: { stockItems: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Productos</h1>
        <Link
          href="/admin/productos/nuevo"
          className="rounded border border-accent px-4 py-2 font-display text-sm hover:bg-accent hover:text-background"
        >
          + Nuevo producto
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border text-foreground/60">
            <tr>
              <th className="p-3 font-display font-normal">Producto</th>
              <th className="p-3 font-display font-normal">Categoría</th>
              <th className="p-3 font-display font-normal">Variantes</th>
              <th className="p-3 font-display font-normal">Stock total</th>
              <th className="p-3 font-display font-normal">Estado</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const totalStock = p.variants.reduce(
                (sum, v) => sum + v.stockItems.reduce((s, si) => s + si.quantity, 0),
                0
              );
              return (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="p-3">{p.name}</td>
                  <td className="p-3">{p.category.name}</td>
                  <td className="p-3">{p.variants.length}</td>
                  <td className="p-3">{totalStock}</td>
                  <td className="p-3">{p.active ? "Activo" : "Inactivo"}</td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/admin/productos/${p.id}/editar`}
                      className="underline underline-offset-4"
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-foreground/60">
                  Todavía no cargaste ningún producto.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
