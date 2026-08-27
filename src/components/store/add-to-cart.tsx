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
    <div className="mt-6 flex flex-col gap-4">
      {variants.length > 1 && (
        <div>
          <label htmlFor="variant" className="block font-display text-sm">
            Presentación
          </label>
          <select
            id="variant"
            value={variantId}
            onChange={(e) => {
              setVariantId(e.target.value);
              setAdded(false);
            }}
            className="mt-1 w-full max-w-xs rounded border border-border bg-background px-3 py-2"
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id} disabled={v.stock <= 0}>
                {v.name} — ${v.price} {v.stock <= 0 ? "(sin stock)" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <p className="font-display text-2xl">${selected?.price}</p>
      <p className="text-sm text-foreground/60">
        {outOfStock ? "Sin stock disponible" : `Stock disponible: ${selected.stock}`}
      </p>

      <div className="flex items-center gap-3">
        <label htmlFor="quantity" className="font-display text-sm">
          Cantidad
        </label>
        <input
          id="quantity"
          type="number"
          min={1}
          max={selected?.stock ?? 1}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
          className="w-20 rounded border border-border bg-background px-2 py-1.5 text-center"
        />
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={outOfStock}
        className="w-fit rounded border border-accent px-6 py-3 font-display text-sm hover:bg-accent hover:text-background disabled:cursor-not-allowed disabled:opacity-50"
      >
        Agregar al carrito
      </button>

      {added && (
        <p role="status" className="text-sm">
          Agregado al carrito.{" "}
          <button
            type="button"
            onClick={() => router.push("/carrito")}
            className="underline underline-offset-4"
          >
            Ver carrito
          </button>
        </p>
      )}
    </div>
  );
}
