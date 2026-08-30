"use client";

import { useEffect, useState } from "react";
import { ProductCard, type CatalogProduct } from "@/components/store/product-card";

const STORAGE_KEY = "epicshine_recently_viewed";

export function RecentlyViewed({ excludeSlug }: { excludeSlug?: string }) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);

  useEffect(() => {
    let slugs: string[] = [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      slugs = raw ? JSON.parse(raw) : [];
    } catch {
      slugs = [];
    }
    if (excludeSlug) slugs = slugs.filter((s) => s !== excludeSlug);
    if (slugs.length === 0) return;
    fetch(`/api/products/recently-viewed?slugs=${slugs.map(encodeURIComponent).join(",")}`)
      .then((res) => res.json())
      .then((data) => setProducts(data.products ?? []))
      .catch(() => setProducts([]));
  }, [excludeSlug]);

  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl border-b border-border px-4 py-14">
      <h2 className="font-display text-2xl font-semibold">Recién vistos</h2>
      <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
