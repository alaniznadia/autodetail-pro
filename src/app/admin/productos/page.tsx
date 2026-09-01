import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductsTable } from "@/components/admin/products-table";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    include: {
      category: { select: { name: true } },
      variants: { include: { stockItems: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = products.map((p) => ({
    id: p.id,
    name: p.name,
    categoryName: p.category.name,
    variantCount: p.variants.length,
    totalStock: p.variants.reduce((sum, v) => sum + v.stockItems.reduce((s, si) => s + si.quantity, 0), 0),
    active: p.active,
  }));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Productos</h1>
        <div className="flex gap-3">
          <Link
            href="/admin/productos/carga-masiva"
            className="rounded border border-border px-4 py-2 font-display text-sm hover:border-accent"
          >
            Carga masiva
          </Link>
          <Link
            href="/admin/productos/nuevo"
            className="rounded border border-accent px-4 py-2 font-display text-sm hover:bg-accent hover:text-background"
          >
            + Nuevo producto
          </Link>
        </div>
      </div>

      <ProductsTable products={rows} />
    </div>
  );
}
