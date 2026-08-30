"use client";

/**
 * Catálogo: sidebar de filtros + grilla de productos.
 * Los controles empujan a la URL (?categoria=&orden=&stock=&q=) sin estado
 * local — el filtrado real sigue pasando por (store)/catalogo/page.tsx
 * (Prisma), igual que el resto del repo.
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductCard, type CatalogProduct } from "@/components/store/product-card";

const ORDERS = [
  { value: "relevancia", label: "Relevancia" },
  { value: "precio-asc", label: "Menor precio" },
  { value: "precio-desc", label: "Mayor precio" },
];

export function CatalogView({
  products,
  categories,
  activeCategory,
  loggedIn = false,
}: {
  products: CatalogProduct[];
  categories: { slug: string; name: string }[];
  activeCategory?: string;
  loggedIn?: boolean;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const activeCat = activeCategory ?? params.get("categoria");
  const activeOrder = params.get("orden") ?? "relevancia";
  const stockOnly = params.get("stock") === "1";

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value === null) next.delete(key);
    else next.set(key, value);
    router.push(`/catalogo?${next.toString()}`);
  }

  return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-9 px-4 pb-14 sm:flex-row sm:gap-9 sm:px-8">
      <div className="min-w-0 flex-1 sm:order-1">
        <div className="mb-4 flex items-baseline gap-3 text-[16px] text-foreground/70">
          <span>
            {products.length} {products.length === 1 ? "producto" : "productos"}
          </span>
        </div>

        {products.length === 0 ? (
          <p className="py-14 text-[18px] text-foreground/72">
            No encontramos productos con esos filtros.{" "}
            <Link href="/catalogo" className="text-accent underline-offset-2 hover:underline">
              Ver todo el catálogo
            </Link>
            .
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} loggedIn={loggedIn} />
            ))}
          </div>
        )}
      </div>

      <aside className="hidden w-[190px] shrink-0 flex-col gap-6 self-start sm:sticky sm:top-[88px] sm:order-2 sm:flex">
        <Filter title="Categoría">
          <FilterLink label="Todo" active={!activeCat} onClick={() => setParam("categoria", null)} />
          {categories.map((c) => (
            <FilterLink
              key={c.slug}
              label={c.name}
              active={activeCat === c.slug}
              onClick={() => setParam("categoria", c.slug)}
            />
          ))}
        </Filter>

        <Rule />

        <Filter title="Disponibilidad">
          <label className="flex cursor-pointer items-center gap-2 text-[18.5px] text-foreground/85">
            <input
              type="checkbox"
              checked={stockOnly}
              onChange={(e) => setParam("stock", e.target.checked ? "1" : null)}
              className="h-[15px] w-[15px] accent-accent"
            />
            Solo con stock
          </label>
        </Filter>

        <Rule />

        <Filter title="Orden">
          {ORDERS.map((o) => (
            <FilterLink
              key={o.value}
              label={o.label}
              active={activeOrder === o.value}
              onClick={() => setParam("orden", o.value)}
            />
          ))}
        </Filter>
      </aside>
    </div>
  );
}

function Filter({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2.5 text-[15.5px] uppercase tracking-[0.14em] text-foreground/62">{title}</p>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function FilterLink({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={`text-left text-[18.5px] ${active ? "text-foreground" : "text-foreground/72 hover:text-foreground"}`}
    >
      {label}
    </button>
  );
}

function Rule() {
  return (
    <hr className="h-px border-0 bg-[linear-gradient(to_right,transparent,var(--color-border)_12px,var(--color-border)_calc(100%-12px),transparent)]" />
  );
}
