"use client";

import { useState, useRef } from "react";

type SearchResult = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  price: string;
  stock: number;
};

type CartLine = SearchResult & { quantity: number };

const PAYMENT_METHODS = [
  { value: "CASH", label: "Efectivo" },
  { value: "CARD", label: "Tarjeta" },
  { value: "MERCADO_PAGO", label: "Mercado Pago" },
] as const;

export function PosTerminal({ locationId }: { locationId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] =
    useState<(typeof PAYMENT_METHODS)[number]["value"]>("CASH");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const total = cart.reduce((sum, line) => sum + Number(line.price) * line.quantity, 0);

  async function handleSearch(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    const res = await fetch(
      `/api/products/search?q=${encodeURIComponent(value)}&locationId=${locationId}`
    );
    const data = await res.json();
    setResults(data.results);
  }

  // Preparado para lector de código de barras: al leer, el lector "tipea"
  // el código y envía Enter, que dispara este mismo flujo de búsqueda.
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && results.length === 1) {
      addToCart(results[0]);
    }
  }

  function addToCart(product: SearchResult) {
    setCart((prev) => {
      const existing = prev.find((l) => l.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.id === product.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setQuery("");
    setResults([]);
    inputRef.current?.focus();
  }

  function updateQuantity(id: string, quantity: number) {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((l) => l.id !== id));
      return;
    }
    setCart((prev) => prev.map((l) => (l.id === id ? { ...l, quantity } : l)));
  }

  async function confirmSale() {
    if (cart.length === 0) return;
    setSubmitting(true);
    setStatus(null);

    const res = await fetch("/api/pos/sale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locationId,
        paymentMethod,
        items: cart.map((l) => ({ variantId: l.id, quantity: l.quantity })),
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setStatus(
        typeof data.error === "string"
          ? data.error
          : "No se pudo registrar la venta. Revisá el stock disponible."
      );
      return;
    }

    setCart([]);
    setStatus("Venta registrada correctamente.");
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <label htmlFor="pos-search" className="block font-display text-sm">
          Buscar producto (nombre, SKU o código de barras)
        </label>
        <input
          id="pos-search"
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-lg"
          placeholder="Escaneá o escribí para buscar..."
        />
        {results.length > 0 && (
          <ul className="mt-2 divide-y divide-border rounded border border-border">
            {results.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => addToCart(r)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted"
                >
                  <span>
                    {r.name} <span className="text-xs text-foreground/50">({r.sku})</span>
                  </span>
                  <span className="text-sm">
                    ${r.price} · stock: {r.stock}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="font-display text-sm">Venta actual</h2>
        <ul className="mt-2 divide-y divide-border rounded border border-border">
          {cart.length === 0 && (
            <li className="px-3 py-4 text-sm text-foreground/50">Sin productos todavía.</li>
          )}
          {cart.map((line) => (
            <li key={line.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="flex-1 text-sm">{line.name}</span>
              <input
                type="number"
                min={0}
                value={line.quantity}
                aria-label={`Cantidad de ${line.name}`}
                onChange={(e) => updateQuantity(line.id, Number(e.target.value))}
                className="w-16 rounded border border-border bg-background px-2 py-1 text-center"
              />
              <span className="w-20 text-right text-sm">
                ${(Number(line.price) * line.quantity).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-4 flex justify-between font-display text-xl">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </p>

        <fieldset className="mt-4">
          <legend className="font-display text-sm">Método de pago</legend>
          <div className="mt-2 flex gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setPaymentMethod(m.value)}
                className={`rounded border px-3 py-2 text-sm ${
                  paymentMethod === m.value
                    ? "border-accent bg-accent text-background"
                    : "border-border"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </fieldset>

        {status && (
          <p role="status" className="mt-4 text-sm">
            {status}
          </p>
        )}

        <button
          type="button"
          onClick={confirmSale}
          disabled={cart.length === 0 || submitting}
          className="mt-6 w-full rounded border border-accent py-3 font-display text-lg hover:bg-accent hover:text-background disabled:opacity-50"
        >
          {submitting ? "Procesando..." : "Confirmar venta"}
        </button>
      </div>
    </div>
  );
}
