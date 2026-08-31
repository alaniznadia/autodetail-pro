import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getStoreTheme, resolveCatalogCardStyle } from "@/lib/store-theme";
import { QuickAddButton } from "@/components/store/quick-add-button";
import { MobileFilterChips } from "@/components/store/mobile-store-ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Catálogo",
  description: "Todos los productos de detailing de Epic Shine.",
  alternates: { canonical: "/catalogo" },
};

const PAGE_SIZE = 24;

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; q?: string; pagina?: string }>;
}) {
  const { categoria, q, pagina } = await searchParams;
  const page = Math.max(1, Number(pagina) || 1);

  const where = {
    active: true,
    category: categoria ? { slug: categoria } : undefined,
    name: q ? { contains: q, mode: "insensitive" as const } : undefined,
  };

  const [categories, products, totalProducts, theme] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where,
      include: {
        variants: { where: { active: true }, take: 1, include: { stockItems: true } },
        images: { take: 1 },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
    getStoreTheme(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalProducts / PAGE_SIZE));

  // Conserva categoria/q al cambiar de página; solo pisa "pagina".
  function pageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (categoria) params.set("categoria", categoria);
    if (q) params.set("q", q);
    if (targetPage > 1) params.set("pagina", String(targetPage));
    const qs = params.toString();
    return qs ? `/catalogo?${qs}` : "/catalogo";
  }

  const cardStyle = resolveCatalogCardStyle(theme);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Catálogo</h1>

      <form
        role="search"
        className="mt-6 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between"
      >
        {categoria && <input type="hidden" name="categoria" value={categoria} />}
        <label htmlFor="q" className="sr-only">
          Buscar productos
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Buscar productos..."
          className="w-full max-w-sm rounded border border-border bg-background px-3 py-2"
        />
        <div className="hidden flex-wrap gap-2 sm:flex">
          <Link
            href="/catalogo"
            className={`rounded border px-3 py-1.5 text-sm ${
              !categoria ? "border-accent bg-accent text-background" : "border-border"
            }`}
          >
            Todas
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/catalogo?categoria=${c.slug}`}
              className={`rounded border px-3 py-1.5 text-sm ${
                categoria === c.slug ? "border-accent bg-accent text-background" : "border-border"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      </form>

      <MobileFilterChips
        categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        active={categoria}
      />

      {products.length === 0 ? (
        <p className="mt-10 text-foreground/60">No encontramos productos con ese filtro.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-5 sm:mt-10 sm:grid-cols-3 sm:gap-6 md:grid-cols-4">
          {products.map((product) => {
            const variant = product.variants[0];
            const image = product.images[0];
            const stock = variant?.stockItems.reduce((sum, s) => sum + s.quantity, 0) ?? 0;
            return (
              <li key={product.id} className="rounded border border-border p-3 transition hover:border-accent">
                <Link href={`/producto/${product.slug}`} className="group block">
                  <div className="relative aspect-square overflow-hidden rounded bg-white">
                    {image && (
                      <Image
                        src={image.url}
                        alt={image.altText}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                        className="object-contain transition group-hover:scale-105"
                      />
                    )}
                  </div>
                  <p className="mt-2 font-display text-sm" style={cardStyle.textStyle}>
                    {product.name}
                  </p>
                  {variant && (
                    <p className="text-sm text-foreground/70" style={cardStyle.textStyle}>
                      ${variant.price.toString()}
                    </p>
                  )}
                </Link>
                {variant && (
                  <QuickAddButton
                    variantId={variant.id}
                    productSlug={product.slug}
                    productName={product.name}
                    variantName={variant.name}
                    price={variant.price.toString()}
                    imageUrl={image?.url}
                    disabled={stock <= 0}
                    color={cardStyle.buttonColor}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <nav aria-label="Paginación" className="mt-10 flex items-center justify-center gap-4">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="rounded border border-border px-4 py-2 text-sm hover:border-accent"
            >
              ← Anterior
            </Link>
          ) : (
            <span className="rounded border border-border px-4 py-2 text-sm text-foreground/30">
              ← Anterior
            </span>
          )}
          <span className="text-sm text-foreground/60">
            Página {page} de {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={pageHref(page + 1)}
              className="rounded border border-border px-4 py-2 text-sm hover:border-accent"
            >
              Siguiente →
            </Link>
          ) : (
            <span className="rounded border border-border px-4 py-2 text-sm text-foreground/30">
              Siguiente →
            </span>
          )}
        </nav>
      )}
    </div>
  );
}
