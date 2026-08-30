"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/store/cart-context";

type Variant = {
  id: string;
  name: string;
  price: string;
  stock: number;
};

const money = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");

export function AddToCart({
  productSlug,
  productName,
  imageUrl,
  variants,
}: {
  productSlug: string;
  productName: string;
  imageUrl?: string;
  variants: Variant[];
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const selected = variants.find((v) => v.id === variantId);
  const outOfStock = !selected || selected.stock <= 0;

  function handleAdd() {
    if (!selected) return;
    addItem(
      {
        variantId: selected.id,
        productSlug,
        productName,
        variantName: selected.name,
        price: selected.price,
        imageUrl,
      },
      quantity
    );
    setAdded(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[30px] tracking-[-0.02em]">{selected ? money(Number(selected.price)) : ""}</p>

      {variants.length > 1 ? (
        <div>
          <p className="mb-2 text-[11.5px] uppercase tracking-[0.14em] text-foreground/62">Presentación</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setVariantId(v.id);
                  setAdded(false);
                }}
                disabled={v.stock <= 0}
                className={`store-frame px-3.5 py-1.5 text-[14.5px] disabled:cursor-not-allowed disabled:opacity-40 ${
                  v.id === variantId
                    ? "border-accent text-accent"
                    : "border-border text-foreground/85 hover:bg-foreground/5"
                }`}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <div className="store-frame flex h-[46px] items-center border-border">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label="Quitar uno"
            className="h-11 w-11 text-lg"
          >
            −
          </button>
          <span className="w-9 text-center text-[15px]" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(selected?.stock ?? q, q + 1))}
            aria-label="Agregar uno"
            className="h-11 w-11 text-lg"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={outOfStock}
          className="store-frame h-[46px] border-accent px-7 text-sm text-accent hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Agregar al carrito
        </button>

        <span className={`text-xs ${selected && selected.stock > 0 && selected.stock <= 5 ? "text-accent" : "text-foreground/70"}`}>
          {outOfStock
            ? "Sin stock disponible"
            : selected.stock <= 5
              ? `Quedan ${selected.stock}`
              : "En stock · sale hoy"}
        </span>
      </div>

      {added && (
        <p role="status" className="text-sm">
          Agregado al carrito.{" "}
          <button
            type="button"
            onClick={() => router.push("/carrito")}
            className="text-accent underline underline-offset-4"
          >
            Ver carrito
          </button>
        </p>
      )}
    </div>
  );
}
