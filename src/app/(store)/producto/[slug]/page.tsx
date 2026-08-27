import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { AddToCart } from "@/components/store/add-to-cart";

export const dynamic = "force-dynamic";

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

  return {
    title: product.metaTitle ?? product.name,
    description: product.metaDesc ?? product.description ?? undefined,
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
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
