import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductCard, type CatalogProduct } from "@/components/store/product-card";

export default async function ProductNotFound() {
  const products = await prisma.product.findMany({
    where: { active: true },
    include: {
      variants: { where: { active: true }, take: 1, include: { stockItems: true } },
      images: { take: 1 },
      reviews: { where: { approved: true }, select: { rating: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  const suggestions: CatalogProduct[] = products.map((product) => {
    const variant = product.variants[0];
    const image = product.images[0];
    const stock = variant?.stockItems.reduce((sum, s) => sum + s.quantity, 0) ?? 0;
    const reviewCount = product.reviews.length;
    const rating =
      reviewCount > 0
        ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
        : null;
    return {
      id: product.id,
      slug: product.slug,
      sku: variant?.sku ?? "",
      name: product.name,
      variantId: variant?.id ?? "",
      variantName: variant?.name ?? "",
      variantLabel: variant && variant.name !== "Único" ? variant.name : null,
      price: variant?.price.toString() ?? "0",
      stock,
      imageUrl: image?.url ?? null,
      rating,
      reviewCount,
    };
  });

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-14 pt-16 text-center sm:px-8">
      <p className="text-xs uppercase tracking-[0.18em] text-accent">Error 404</p>
      <h1 className="mt-3 text-3xl font-bold tracking-[-0.02em]">
        No encontramos ese producto
      </h1>
      <p className="mt-3 text-foreground/78">
        Puede que ya no esté disponible o que el link esté mal escrito.{" "}
        <Link href="/catalogo" className="text-accent underline underline-offset-2">
          Ver todo el catálogo
        </Link>
        .
      </p>

      {suggestions.length > 0 && (
        <div className="mt-12 text-left">
          <h2 className="font-display text-2xl font-semibold">Te puede interesar</h2>
          <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4">
            {suggestions.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
