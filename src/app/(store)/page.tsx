import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

// El stock y el catálogo cambian en tiempo real (ventas online + POS),
// así que esta página no se debe pre-renderizar como estática.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const categories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { name: "asc" },
    take: 6,
  });

  const featuredProducts = await prisma.product.findMany({
    where: { active: true },
    include: { variants: { where: { active: true }, take: 1 }, images: { take: 1 } },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return (
    <div>
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

      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-14">
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
        {featuredProducts.length === 0 ? (
          <p className="mt-6 text-foreground/60">
            Todavía no hay productos cargados. Cargalos desde el panel de administración.
          </p>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
            {featuredProducts.map((product) => {
              const variant = product.variants[0];
              const image = product.images[0];
              return (
                <li key={product.id}>
                  <Link href={`/producto/${product.slug}`} className="group block">
                    <div className="aspect-square overflow-hidden rounded bg-black">
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
                    {variant && (
                      <p className="text-sm text-foreground/70">
                        ${variant.price.toString()}
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
