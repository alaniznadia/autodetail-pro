"use client";

import Link from "next/link";
import { useCart } from "@/components/store/cart-context";

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Tu carrito está vacío</h1>
        <Link
          href="/catalogo"
          className="mt-6 inline-block rounded border border-accent px-6 py-3 font-display text-sm hover:bg-accent hover:text-background"
        >
          Ver catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-2xl font-bold">Tu carrito</h1>
      <ul className="mt-6 divide-y divide-border rounded border border-border">
        {items.map((item) => (
          <li key={item.variantId} className="flex items-center gap-4 p-4">
            <div className="flex-1">
              <p className="font-display text-sm">
                {item.productName} — {item.variantName}
              </p>
              <p className="text-sm text-foreground/60">${item.price}</p>
            </div>
            <label className="sr-only" htmlFor={`qty-${item.variantId}`}>
              Cantidad de {item.productName}
            </label>
            <input
              id={`qty-${item.variantId}`}
              type="number"
              min={0}
              value={item.quantity}
              onChange={(e) => updateQuantity(item.variantId, Number(e.target.value))}
              className="w-16 rounded border border-border bg-background px-2 py-1 text-center"
            />
            <p className="w-24 text-right font-display text-sm">
              ${(Number(item.price) * item.quantity).toFixed(2)}
            </p>
            <button
              type="button"
              onClick={() => removeItem(item.variantId)}
              aria-label={`Quitar ${item.productName} del carrito`}
              className="text-sm text-red-400 underline underline-offset-4"
            >
              Quitar
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between">
        <p className="font-display text-xl">
          Subtotal: <span>${subtotal.toFixed(2)}</span>
        </p>
        <Link
          href="/checkout"
          className="rounded border border-accent px-6 py-3 font-display text-sm hover:bg-accent hover:text-background"
        >
          Continuar compra
        </Link>
      </div>
    </div>
  );
}
