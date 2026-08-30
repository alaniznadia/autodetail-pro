import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { CatalogView } from "@/components/store/catalog-view";
import type { CatalogProduct } from "@/components/store/product-card";
import { MobileFilterChips } from "@/components/store/mobile-store-ui";
import { getActivePromoCoupon } from "@/lib/coupons";
import { getFavoritedProductIds } from "@/lib/favorites";

const money = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");

function couponLabel(coupon: { percentOff: number | null; amountOff: unknown; minOrderTotal: unknown }) {
  const parts: string[] = [];
  if (coupon.percentOff) parts.push(`${coupon.percentOff}% OFF`);
  if (coupon.amountOff) parts.push(`${money(Number(coupon.amountOff))} OFF`);
  let label = parts.join(" + ") || "Descuento especial";
  if (coupon.minOrderTotal) label += ` en compras desde ${money(Number(coupon.minOrderTotal))}`;
  return label;
}

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Catálogo",
  description: "Todos los productos de detailing de Epic Shine.",
  alternates: { canonical: "/catalogo" },
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; q?: string; orden?: string; stock?: string }>;
}) {
  const { categoria, q, orden, stock } = await searchParams;

  const [session, categories, products, promoCoupon] = await Promise.all([
    auth(),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: {
        active: true,
        category: categoria ? { slug: categoria } : undefined,
        name: q ? { contains: q, mode: "insensitive" } : undefined,
      },
      include: {
        variants: { where: { active: true }, take: 1, include: { stockItems: true } },
        images: { take: 1 },
        reviews: { where: { approved: true }, select: { rating: true } },
      },
      orderBy:
        orden === "precio-asc" || orden === "precio-desc"
          ? undefined
          : { name: "asc" },
    }),
    getActivePromoCoupon(),
  ]);

  const favoritedIds = await getFavoritedProductIds(
    session?.user?.id,
    products.map((p) => p.id)
  );

  let items: CatalogProduct[] = products.map((product) => {
    const variant = product.variants[0];
    const image = product.images[0];
    const productStock = variant?.stockItems.reduce((sum, s) => sum + s.quantity, 0) ?? 0;
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
      stock: productStock,
      imageUrl: image?.url ?? null,
      rating,
      reviewCount,
      favorited: favoritedIds.has(product.id),
    };
  });

  if (stock === "1") items = items.filter((p) => p.stock > 0);
  if (orden === "precio-asc") items = [...items].sort((a, b) => Number(a.price) - Number(b.price));
  if (orden === "precio-desc") items = [...items].sort((a, b) => Number(b.price) - Number(a.price));

  const activeCategoryName = categoria ? categories.find((c) => c.slug === categoria)?.name : undefined;

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-2 pt-8 sm:px-8">
      <nav className="mb-4 text-xs text-foreground/62" aria-label="Ruta">
        <a href="/" className="hover:text-foreground">Inicio</a>{" / "}
        {activeCategoryName ? (
          <>
            <a href="/catalogo" className="hover:text-foreground">Catálogo</a>
            {" / "}
            {activeCategoryName}
          </>
        ) : (
          "Catálogo"
        )}
      </nav>
      <h1 className="mb-4 text-3xl font-bold tracking-[-0.02em] sm:text-4xl">Catálogo</h1>
      {promoCoupon && (
        <p className="store-frame mb-6 border-accent bg-accent/10 px-4 py-2.5 text-sm text-foreground">
          🎟️ Usá el cupón <strong className="font-bold">{promoCoupon.code}</strong> y obtené{" "}
          {couponLabel(promoCoupon)}
        </p>
      )}
      <div className="mb-6 sm:hidden">
        <MobileFilterChips
          categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
          active={categoria}
        />
      </div>
      <CatalogView
        products={items}
        categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        activeCategory={categoria}
        loggedIn={!!session?.user}
      />
    </div>
  );
}
