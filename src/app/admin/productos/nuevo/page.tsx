import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/product-form";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Nuevo producto</h1>
      {categories.length === 0 ? (
        <p className="mt-6 text-foreground/70">
          Primero necesitás crear al menos una categoría.
        </p>
      ) : (
        <ProductForm categories={categories} />
      )}
    </div>
  );
}
