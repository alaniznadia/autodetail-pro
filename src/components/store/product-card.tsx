"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/store/cart-context";
import { useAdaptiveFrameBg } from "@/components/store/use-adaptive-frame-bg";

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
  const [quantity, setQuantity] = useState(1);
  const { bg, imgRef } = useAdaptiveFrameBg();
  const low = product.stock > 0 && product.stock <= 5;

  return (
    <article className="flex flex-col gap-2.5">
      <Link
        href={`/producto/${product.slug}`}
        className="store-frame group relative block aspect-square overflow-hidden border-border bg-surface"
        style={bg ? { backgroundColor: bg } : undefined}
      >
        {product.imageUrl ? (
          <Image
            ref={imgRef}
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width:640px) 50vw, 280px"
            className="object-contain p-4 transition-transform duration-300 ease-out group-hover:scale-110"
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
        <Link href={`/producto/${product.slug}`} className="text-[15.5px] font-bold">
          {product.name}
        </Link>
        <p className="text-[11.5px] text-foreground/50">
          {product.variantLabel ? `${product.variantLabel} · ` : ""}
          {product.sku}
        </p>
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <span className="text-[17px] font-bold">{money(Number(product.price))}</span>
        <div className="flex items-center gap-2">
          <div className="store-frame flex h-9 shrink-0 items-center border-border">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Quitar uno"
              disabled={product.stock === 0}
              className="h-9 w-8 text-sm disabled:cursor-not-allowed disabled:text-foreground/30"
            >
              −
            </button>
            <span className="w-6 text-center text-[13px]" aria-live="polite">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(product.stock || q, q + 1))}
              aria-label="Agregar uno"
              disabled={product.stock === 0}
              className="h-9 w-8 text-sm disabled:cursor-not-allowed disabled:text-foreground/30"
            >
              +
            </button>
          </div>
          <button
            type="button"
            disabled={product.stock === 0}
            onClick={() => {
              addItem(
                {
                  variantId: product.variantId,
                  productSlug: product.slug,
                  productName: product.name,
                  variantName: product.variantName,
                  price: product.price,
                  imageUrl: product.imageUrl ?? undefined,
                },
                quantity
              );
              setQuantity(1);
            }}
            className="store-frame h-9 flex-1 border-accent px-2.5 text-xs text-accent hover:bg-accent/10 disabled:cursor-not-allowed disabled:border-border disabled:text-foreground/40"
          >
            Agregar
          </button>
        </div>
      </div>
    </article>
  );
}
