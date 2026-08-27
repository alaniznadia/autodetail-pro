import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { AddToCart } from "@/components/store/add-to-cart";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    image: product.images.map((img) => toAbsoluteImageUrl(img.url)),
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
        <div className="aspect-square overflow-hidden rounded bg-muted">
          {product.images[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.images[0].url}
              alt={product.images[0].altText}
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <div>
          <h1 className="font-display text-3xl font-bold">{product.name}</h1>
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
    </div>
  );
}
