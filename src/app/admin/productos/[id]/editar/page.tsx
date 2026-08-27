import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/product-form";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { variants: { include: { stockItems: true } } },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!product) notFound();

  const initial = {
    id: product.id,
    name: product.name,
    brand: product.brand ?? "",
    categoryId: product.categoryId,
    description: product.description ?? "",
    active: product.active,
    variants: product.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      name: v.name,
      price: v.price.toString(),
      costPrice: v.costPrice?.toString() ?? "",
      barcode: v.barcode ?? "",
      stock: v.stockItems.reduce((sum, s) => sum + s.quantity, 0).toString(),
    })),
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Editar producto</h1>
      <ProductForm categories={categories} initial={initial} />
    </div>
  );
}
