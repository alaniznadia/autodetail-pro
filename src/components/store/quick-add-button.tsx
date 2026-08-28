"use client";

import { useState } from "react";
import { useCart } from "@/components/store/cart-context";

export function QuickAddButton({
  variantId,
  productSlug,
  productName,
  variantName,
  price,
  imageUrl,
  disabled,
  color,
}: {
  variantId: string;
  productSlug: string;
  productName: string;
  variantName: string;
  price: string;
  imageUrl?: string;
  disabled?: boolean;
  color: string;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleClick(e: React.MouseEvent) {
    // El botón vive dentro del mismo <li> que el link a la ficha del
    // producto (no adentro, para no anidar interactivos): igual conviene
    // frenar la propagación por si el layout cambia.
    e.preventDefault();
    e.stopPropagation();
    addItem({ variantId, productSlug, productName, variantName, price, imageUrl });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      style={disabled ? undefined : { backgroundColor: color, borderColor: color }}
      className="mt-3 w-full rounded-full border px-4 py-2 font-display text-xs uppercase tracking-wide text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:border-border disabled:bg-transparent disabled:text-foreground/40"
    >
      {disabled ? "Sin stock" : added ? "¡Agregado!" : "Comprar"}
    </button>
  );
}
