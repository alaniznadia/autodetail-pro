import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasVerifiedPurchase } from "@/lib/reviews";
import { AddToCart } from "@/components/store/add-to-cart";
import { ProductGallery } from "@/components/store/product-gallery";
import { ReviewForm } from "@/components/store/review-form";
import { BackButton } from "@/components/back-button";
import { ProductCard, type CatalogProduct } from "@/components/store/product-card";
import { FavoriteButton } from "@/components/store/favorite-button";
import { TrackRecentlyViewed } from "@/components/store/track-recently-viewed";
import { getFavoritedProductIds } from "@/lib/favorites";
import { SITE_URL } from "@/lib/site-url";

export const dynamic = "force-dynamic";

// Los datos de ejemplo (seed) usan imágenes inline (data: URI) en vez de
// archivos subidos; a diferencia de una ruta relativa como
// /uploads/products/x.png, esas ya son autocontenidas y no hay que
// anteponerles la URL del sitio.
function toAbsoluteImageUrl(url: string) {
  return url.startsWith("/") ? `${SITE_URL}${url}` : url;
}

async function getProduct(slug: string) {
  return prisma.product.findUnique({
    where: { slug, active: true },
    include: {
      category: true,
      images: { orderBy: { position: "asc" } },
      variants: { where: { active: true }, include: { stockItems: true } },
      reviews: {
        include: { customer: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};

  const title = product.metaTitle ?? product.name;
  const description = product.metaDesc ?? product.description ?? undefined;
  const image = product.images[0];

  return {
    title,
    description,
    alternates: { canonical: `/producto/${product.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      images: image ? [{ url: image.url, alt: image.altText }] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const variants = product.variants.map((v) => ({
    id: v.id,
    name: v.name,
    price: v.price.toString(),
    stock: v.stockItems.reduce((sum, s) => sum + s.quantity, 0),
  }));

  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
  const prices = variants.map((v) => Number(v.price));

  // Solo las reseñas aprobadas por un admin se muestran públicamente; una
  // reseña propia pendiente de moderación igual se puede ver/editar más
  // abajo (myReview busca en todas, no solo en las aprobadas).
  const approvedReviews = product.reviews.filter((r) => r.approved);
  const reviewCount = approvedReviews.length;
  const averageRating =
    reviewCount > 0
      ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : null;

  const session = await auth();
  const canReview = session?.user
    ? await hasVerifiedPurchase(session.user.id, product.id)
    : false;
  const myReview = session?.user
    ? product.reviews.find((r) => r.customerId === session.user.id)
    : undefined;

  const relatedProducts = await prisma.product.findMany({
    where: { active: true, categoryId: product.categoryId, id: { not: product.id } },
    include: {
      variants: { where: { active: true }, take: 1, include: { stockItems: true } },
      images: { take: 1 },
      reviews: { where: { approved: true }, select: { rating: true } },
    },
    take: 8,
  });

  const favoritedIds = await getFavoritedProductIds(session?.user?.id, [
    product.id,
    ...relatedProducts.map((p) => p.id),
  ]);

  const suggestions: CatalogProduct[] = relatedProducts.map((p) => {
    const variant = p.variants[0];
    const image = p.images[0];
    const stock = variant?.stockItems.reduce((sum, s) => sum + s.quantity, 0) ?? 0;
    const relatedReviewCount = p.reviews.length;
    const relatedRating =
      relatedReviewCount > 0
        ? p.reviews.reduce((sum, r) => sum + r.rating, 0) / relatedReviewCount
        : null;
    return {
      id: p.id,
      slug: p.slug,
      sku: variant?.sku ?? "",
      name: p.name,
      variantId: variant?.id ?? "",
      variantName: variant?.name ?? "",
      variantLabel: variant && variant.name !== "Único" ? variant.name : null,
      price: variant?.price.toString() ?? "0",
      stock,
      imageUrl: image?.url ?? null,
      rating: relatedRating,
      reviewCount: relatedReviewCount,
      favorited: favoritedIds.has(p.id),
    };
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    image: product.images.map((img) => toAbsoluteImageUrl(img.url)),
    aggregateRating: averageRating
      ? {
          "@type": "AggregateRating",
          ratingValue: Number(averageRating.toFixed(1)),
          reviewCount,
        }
      : undefined,
    offers:
      prices.length > 0
        ? {
            "@type": "AggregateOffer",
            priceCurrency: "ARS",
            lowPrice: Math.min(...prices),
            highPrice: Math.max(...prices),
            offerCount: prices.length,
            availability:
              totalStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: `${SITE_URL}/producto/${product.slug}`,
          }
        : undefined,
  };

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-14 pt-6 sm:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BackButton className="mb-3 text-[18px] text-foreground/70" />
      <TrackRecentlyViewed slug={product.slug} />
      <nav className="mb-6 text-[16px] text-foreground/62" aria-label="Ruta">
        <a href="/catalogo" className="hover:text-foreground">Catálogo</a> / {product.category.name} / {product.name}
      </nav>

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
        <ProductGallery
          images={product.images.map((img) => ({ id: img.id, url: img.url, altText: img.altText }))}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div>
            <p className="text-[16.5px] uppercase tracking-[0.16em] text-accent">{product.category.name}</p>
            <h1 className="mt-2.5 text-[32px] font-medium leading-[1.1] tracking-[-0.025em] sm:text-[38px]">
              {product.name}
            </h1>
            {averageRating && (
              <p className="mt-2 text-[18px] text-foreground/85">
                <span aria-hidden="true">{"★".repeat(Math.round(averageRating))}</span>
                <span className="sr-only">{averageRating.toFixed(1)} de 5 estrellas</span>{" "}
                {averageRating.toFixed(1)} ({reviewCount} {reviewCount === 1 ? "reseña" : "reseñas"})
              </p>
            )}
            {product.brand && <p className="mt-1 text-[18px] text-foreground/78">{product.brand}</p>}
            {product.description && (
              <p className="mt-2.5 max-w-[520px] text-[18px] leading-[1.65] text-foreground/78 text-pretty">
                {product.description}
              </p>
            )}
          </div>

          <div className="flex items-start gap-3">
            {variants.length > 0 ? (
              <AddToCart
                productSlug={product.slug}
                productName={product.name}
                imageUrl={product.images[0]?.url}
                variants={variants}
              />
            ) : (
              <p className="text-foreground/78">Este producto no tiene stock cargado.</p>
            )}
            <FavoriteButton
              productId={product.id}
              initialFavorited={favoritedIds.has(product.id)}
              loggedIn={!!session?.user}
              className="store-frame mt-1 border-border p-2.5"
            />
          </div>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-12 border-t border-border pt-10">
          <h2 className="font-display text-[28px] font-semibold">También te puede interesar</h2>
          <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4">
            {suggestions.map((item) => (
              <ProductCard key={item.id} product={item} loggedIn={!!session?.user} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-12 max-w-2xl border-t border-border pt-10">
        <h2 className="text-[22px] font-medium">Reseñas</h2>

        {canReview && (
          <>
            <ReviewForm
              productId={product.id}
              initial={myReview ? { rating: myReview.rating, comment: myReview.comment } : undefined}
            />
            {myReview && !myReview.approved && (
              <p className="mt-2 text-[16px] text-foreground/78">
                Tu reseña está pendiente de aprobación y todavía no es visible para otros clientes.
              </p>
            )}
          </>
        )}

        {approvedReviews.length === 0 ? (
          <p className="mt-4 text-[18px] text-foreground/78">Todavía no hay reseñas.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {approvedReviews.map((review) => (
              <li key={review.id} className="store-frame border-border p-4 text-[18px]">
                <div className="flex items-center justify-between">
                  <span className="font-display">{review.customer.name ?? "Cliente"}</span>
                  <span aria-label={`${review.rating} de 5 estrellas`} className="text-accent">
                    {"★".repeat(review.rating)}
                    <span className="text-foreground/45">{"★".repeat(5 - review.rating)}</span>
                  </span>
                </div>
                {review.comment && <p className="mt-2 text-foreground/90">{review.comment}</p>}
                <p className="mt-2 text-[16px] text-foreground/70">
                  {review.createdAt.toLocaleDateString("es-AR")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
