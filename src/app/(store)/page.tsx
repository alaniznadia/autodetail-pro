import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { HeroCarousel } from "@/components/store/hero-carousel";
import { ProductCard, type CatalogProduct } from "@/components/store/product-card";
import { RecentlyViewed } from "@/components/store/recently-viewed";

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
      reviews: { where: { approved: true }, select: { rating: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const featured: CatalogProduct[] = featuredProducts.map((product) => {
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
    <div>
      {banners.length > 0 ? (
        <section className="border-b border-border" aria-label="Promociones">
          <HeroCarousel banners={banners} />
        </section>
      ) : (
        <section className="border-b border-border bg-[radial-gradient(1100px_480px_at_18%_-10%,color-mix(in_srgb,var(--accent)_22%,transparent),transparent_60%)]">
          <div className="mx-auto max-w-6xl px-4 py-24">
            <p className="text-xs uppercase tracking-[0.18em] text-accent">Detailing profesional</p>
            <h1 className="mt-4 max-w-xl text-[40px] font-bold leading-[1.05] tracking-[-0.02em] sm:text-[56px]">
              Cuidado y estética para tu auto, de local.
            </h1>
            <p className="mt-5 max-w-md text-foreground/80">
              Productos profesionales para el cuidado y la estética de tu auto.
              Envíos a todo el país o retiro en el local.
            </p>
            <Link
              href="/catalogo"
              className="store-frame mt-9 inline-flex items-center gap-2 border-accent px-7 py-3.5 text-sm font-semibold text-accent hover:bg-accent/10"
            >
              Ver catálogo
            </Link>
          </div>
        </section>
      )}

      <RecentlyViewed />

      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl border-b border-border px-4 py-14">
          <h2 className="text-xs uppercase tracking-[0.14em] text-foreground/62">Categorías</h2>
          <ul className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-6">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/catalogo?categoria=${category.slug}`}
                  className="store-frame block border-border p-4 text-center text-sm transition hover:border-accent"
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
          <p className="mt-6 text-foreground/78">
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
