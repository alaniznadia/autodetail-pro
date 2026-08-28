import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasVerifiedPurchase } from "@/lib/reviews";
import { AddToCart } from "@/components/store/add-to-cart";
import { ReviewForm } from "@/components/store/review-form";
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

  const reviewCount = product.reviews.length;
  const averageRating =
    reviewCount > 0
      ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : null;

  const session = await auth();
  const canReview = session?.user
    ? await hasVerifiedPurchase(session.user.id, product.id)
    : false;
  const myReview = session?.user
    ? product.reviews.find((r) => r.customerId === session.user.id)
    : undefined;

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
    <div className="mx-auto max-w-5xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Categoría" className="text-sm text-foreground/60">
        {product.category.name}
      </nav>

      <div className="mt-4 grid gap-10 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded bg-white">
          {product.images[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.images[0].url}
              alt={product.images[0].altText}
              className="h-full w-full object-contain"
            />
          )}
        </div>

        <div>
          <h1 className="font-display text-3xl font-bold">{product.name}</h1>
          {averageRating && (
            <p className="mt-1 text-sm text-foreground/70">
              <span aria-hidden="true">{"★".repeat(Math.round(averageRating))}</span>
              <span className="sr-only">
                {averageRating.toFixed(1)} de 5 estrellas
              </span>{" "}
              {averageRating.toFixed(1)} ({reviewCount}{" "}
              {reviewCount === 1 ? "reseña" : "reseñas"})
            </p>
          )}
          {product.brand && <p className="mt-1 text-foreground/60">{product.brand}</p>}
          {product.description && (
            <p className="mt-4 text-foreground/80">{product.description}</p>
          )}

          {variants.length > 0 ? (
            <AddToCart
              productSlug={product.slug}
              productName={product.name}
              imageUrl={product.images[0]?.url}
              variants={variants}
            />
          ) : (
            <p className="mt-6 text-foreground/60">Este producto no tiene stock cargado.</p>
          )}
        </div>
      </div>

      <div className="mt-12 max-w-2xl">
        <h2 className="font-display text-lg">Reseñas</h2>

        {canReview && (
          <ReviewForm
            productId={product.id}
            initial={myReview ? { rating: myReview.rating, comment: myReview.comment } : undefined}
          />
        )}

        {product.reviews.length === 0 ? (
          <p className="mt-4 text-sm text-foreground/60">Todavía no hay reseñas.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {product.reviews.map((review) => (
              <li key={review.id} className="rounded border border-border p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-display">{review.customer.name ?? "Cliente"}</span>
                  <span aria-label={`${review.rating} de 5 estrellas`} className="text-accent">
                    {"★".repeat(review.rating)}
                    <span className="text-foreground/30">{"★".repeat(5 - review.rating)}</span>
                  </span>
                </div>
                {review.comment && <p className="mt-2 text-foreground/80">{review.comment}</p>}
                <p className="mt-2 text-xs text-foreground/50">
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
