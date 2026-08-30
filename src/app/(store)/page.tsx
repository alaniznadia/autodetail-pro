import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { HeroCarousel } from "@/components/store/hero-carousel";
import { ProductCard, type CatalogProduct } from "@/components/store/product-card";

// El stock y el catálogo cambian en tiempo real (ventas online + POS),
// así que esta página no se debe pre-renderizar como estática.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const banners = await prisma.storeBanner.findMany({
    where: { active: true },
    orderBy: { position: "asc" },
  });

  const categories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { name: "asc" },
    take: 6,
  });

  const featuredProducts = await prisma.product.findMany({
    where: { active: true },
    include: {
      variants: { where: { active: true }, take: 1, include: { stockItems: true } },
      images: { take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const featured: CatalogProduct[] = featuredProducts.map((product) => {
    const variant = product.variants[0];
    const image = product.images[0];
    const stock = variant?.stockItems.reduce((sum, s) => sum + s.quantity, 0) ?? 0;
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
    };
  });

  return (
    <div>
      {banners.length > 0 ? (
        <section className="border-b border-border" aria-label="Promociones">
          <HeroCarousel banners={banners} />
        </section>
      ) : (
        <section className="border-b border-border bg-muted">
          <div className="mx-auto max-w-6xl px-4 py-20 text-center">
            <h1 className="font-display text-4xl font-bold sm:text-6xl">
              Detailing Mode
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-foreground/70">
              Productos profesionales para el cuidado y la estética de tu auto.
              Envíos a todo el país o retiro en el local.
            </p>
            <Link
              href="/catalogo"
              className="mt-8 inline-block rounded border border-accent px-8 py-3 font-display text-sm hover:bg-accent hover:text-background"
            >
              Ver catálogo
            </Link>
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl border-b border-border px-4 py-14">
          <h2 className="font-display text-2xl font-semibold">Categorías</h2>
          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/catalogo?categoria=${category.slug}`}
                  className="block rounded border border-border p-4 text-center font-display text-sm transition hover:border-accent"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="font-display text-2xl font-semibold">Destacados</h2>
        {featured.length === 0 ? (
          <p className="mt-6 text-foreground/60">
            Todavía no hay productos cargados. Cargalos desde el panel de administración.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
