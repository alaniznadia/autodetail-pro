"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/store/cart-context";

export type CatalogProduct = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  variantId: string;
  variantName: string;
  variantLabel: string | null;
  price: string;
  stock: number;
  imageUrl: string | null;
};

const money = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");

export function ProductCard({ product }: { product: CatalogProduct }) {
  const { addItem } = useCart();
  const low = product.stock > 0 && product.stock <= 5;

  return (
    <article className="flex flex-col gap-2.5">
      <Link
        href={`/producto/${product.slug}`}
        className="store-frame relative block aspect-square overflow-hidden border-border bg-surface"
      >
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width:640px) 50vw, 280px"
            className="object-cover"
          />
        ) : null}
        {low ? (
          <span className="absolute left-2 top-2 rounded bg-accent/25 px-2 py-0.5 text-[11px] text-foreground">
            últimas {product.stock}
          </span>
        ) : null}
        {product.stock === 0 ? (
          <span className="absolute left-2 top-2 rounded bg-background/80 px-2 py-0.5 text-[11px] text-foreground/70">
            Sin stock
          </span>
        ) : null}
      </Link>

      <div>
        <Link href={`/producto/${product.slug}`} className="text-[13.5px]">
          {product.name}
        </Link>
        <p className="text-[11.5px] text-foreground/50">
          {product.variantLabel ? `${product.variantLabel} · ` : ""}
          {product.sku}
        </p>
      </div>

      <div className="mt-auto flex items-center gap-2">
        <span className="flex-1 text-[15px]">{money(Number(product.price))}</span>
        <button
          type="button"
          disabled={product.stock === 0}
          onClick={() =>
            addItem({
              variantId: product.variantId,
              productSlug: product.slug,
              productName: product.name,
              variantName: product.variantName,
              price: product.price,
              imageUrl: product.imageUrl ?? undefined,
            })
          }
          className="store-frame border-accent px-2.5 py-1.5 text-xs text-accent hover:bg-accent/10 disabled:cursor-not-allowed disabled:border-border disabled:text-foreground/40"
        >
          Agregar
        </button>
      </div>
    </article>
  );
}
