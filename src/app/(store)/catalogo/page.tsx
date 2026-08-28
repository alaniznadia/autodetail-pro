import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Catálogo",
  description: "Todos los productos de detailing de Epic Shine.",
  alternates: { canonical: "/catalogo" },
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; q?: string }>;
}) {
  const { categoria, q } = await searchParams;

  const [categories, products] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: {
        active: true,
        category: categoria ? { slug: categoria } : undefined,
        name: q ? { contains: q, mode: "insensitive" } : undefined,
      },
      include: { variants: { where: { active: true }, take: 1 }, images: { take: 1 } },
      orderBy: { name: "asc" },
    }),
  ]);

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
        <div className="flex flex-wrap gap-2">
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

      {products.length === 0 ? (
        <p className="mt-10 text-foreground/60">No encontramos productos con ese filtro.</p>
      ) : (
        <ul className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
          {products.map((product) => {
            const variant = product.variants[0];
            const image = product.images[0];
            return (
              <li key={product.id}>
                <Link
                  href={`/producto/${product.slug}`}
                  className="group block rounded border border-border p-3 transition hover:border-accent"
                >
                  <div className="aspect-square overflow-hidden rounded bg-white">
                    {image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image.url}
                        alt={image.altText}
                        className="h-full w-full object-contain transition group-hover:scale-105"
                      />
                    )}
                  </div>
                  <p className="mt-2 font-display text-sm">{product.name}</p>
                  {variant && <p className="text-sm text-foreground/70">${variant.price.toString()}</p>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
