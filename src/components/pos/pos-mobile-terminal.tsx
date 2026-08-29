"use client";

/**
 * POS móvil — la app del local en el teléfono.
 *
 * Misma lógica que `pos-terminal.tsx` (búsqueda por nombre/SKU/código de
 * barras, cupón, descuento manual, métodos de pago, idempotencia), pero con
 * layout de una sola columna, targets de 44px y el total fijo abajo.
 * Usa exactamente los mismos endpoints, así que no requiere cambios de API:
 *   GET  /api/products/search?q=&locationId=
 *   POST /api/coupons/validate
 *   POST /api/pos/sale
 *
 * Nuevo respecto del terminal de escritorio: selector de sucursal (multi-local).
 */

import { useState, useRef } from "react";
import Link from "next/link";
import { fetchWithRetry } from "@/lib/fetch-retry";

type SearchResult = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  price: string;
  stock: number;
  imageUrl: string | null;
};

type CartLine = SearchResult & { quantity: number };

export type PosLocation = { id: string; name: string };

const PAYMENT_METHODS = [
  { value: "CASH", label: "Efectivo" },
  { value: "CARD", label: "Tarjeta" },
  { value: "MERCADO_PAGO", label: "Mercado Pago" },
] as const;

const money = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");

export function PosMobileTerminal({
  locations,
  initialLocationId,
}: {
  locations: PosLocation[];
  initialLocationId: string;
}) {
  const [locationId, setLocationId] = useState(initialLocationId);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] =
    useState<(typeof PAYMENT_METHODS)[number]["value"]>("CASH");
  const [status, setStatus] = useState<string | null>(null);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fija durante toda la venta: reintentar (doble toque, red lenta) nunca
  // cobra dos veces. Se renueva recién cuando la venta se confirma.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [discountValue, setDiscountValue] = useState("");

  const subtotal = cart.reduce((sum, l) => sum + Number(l.price) * l.quantity, 0);
  const manualPercent = Math.min(Number(discountValue) || 0, 100);
  const manualDiscount = subtotal * (manualPercent / 100);
  const totalDiscount = Math.min((appliedCoupon?.discount ?? 0) + manualDiscount, subtotal);
  const total = subtotal - totalDiscount;

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

  // El lector de código de barras "tipea" el código y manda Enter.
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && results.length === 1) addToCart(results[0]);
  }

  function addToCart(product: SearchResult) {
    setCart((prev) => {
      const existing = prev.find((l) => l.id === product.id);
      if (existing) {
        return prev.map((l) => (l.id === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setQuery("");
    setResults([]);
    setStatus(null);
    inputRef.current?.focus();
  }

  function updateQuantity(id: string, quantity: number) {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((l) => l.id !== id));
      return;
    }
    setCart((prev) => prev.map((l) => (l.id === id ? { ...l, quantity } : l)));
  }

  async function applyCoupon() {
    setCouponError(null);
    const res = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: couponCode, subtotal }),
    });
    const data = await res.json();
    if (!res.ok) {
      setCouponError(typeof data.error === "string" ? data.error : "Cupón inválido.");
      setAppliedCoupon(null);
      return;
    }
    setAppliedCoupon({ code: couponCode.toUpperCase(), discount: Number(data.discountTotal) });
  }

  async function confirmSale() {
    if (cart.length === 0) return;
    setSubmitting(true);
    setStatus(null);
    setLastSaleId(null);

    let res: Response;
    try {
      res = await fetchWithRetry("/api/pos/sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          paymentMethod,
          couponCode: appliedCoupon?.code,
          manualDiscount: manualPercent > 0 ? { type: "PERCENT", value: manualPercent } : undefined,
          idempotencyKey,
          items: cart.map((l) => ({ variantId: l.id, quantity: l.quantity })),
        }),
      });
    } catch (err) {
      setSubmitting(false);
      setStatus(
        err instanceof Error
          ? err.message
          : "No se pudo conectar con el servidor. Revisá la conexión e intentá de nuevo."
      );
      return;
    }

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

    const { order } = await res.json();
    setCart([]);
    setCouponCode("");
    setAppliedCoupon(null);
    setDiscountValue("");
    setIdempotencyKey(crypto.randomUUID());
    setStatus("Venta registrada correctamente.");
    setLastSaleId(order.id);
  }

  return (
    <div className="noc flex min-h-dvh flex-col">
      {/* Encabezado: marca + sucursal activa */}
      <header className="flex items-center gap-3 bg-[#1b1d2b] px-4 pb-3 pt-4">
        <span className="mr-auto text-xs font-medium uppercase tracking-[0.16em] text-noc-accent">
          Epic Shine · POS
        </span>
        <label className="sr-only" htmlFor="pos-location">
          Sucursal
        </label>
        <select
          id="pos-location"
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          className="noc-input min-h-9 w-auto py-1 text-sm"
        >
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </header>

      {/* Búsqueda / escaneo */}
      <div className="flex flex-col gap-2 px-4 pt-3">
        <label className="sr-only" htmlFor="pos-search">
          Buscar producto (nombre, SKU o código de barras)
        </label>
        <input
          id="pos-search"
          ref={inputRef}
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          inputMode="search"
          autoFocus
          placeholder="Escaneá o escribí — nombre, SKU o código"
          className="noc-input"
        />
        {results.length > 0 && (
          <ul className="overflow-hidden rounded-lg border border-noc-divider">
            {results.map((r) => (
              <li key={r.id} className="border-b border-noc-divider last:border-0">
                <button
                  type="button"
                  onClick={() => addToCart(r)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{r.name}</span>
                    <span className="block text-[11px] text-noc-muted">{r.sku}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-medium">{money(Number(r.price))}</span>
                    <span className="block text-[10px] text-noc-muted">stock {r.stock}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Venta actual */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-noc-muted">
          Venta actual
        </p>
        {cart.length === 0 && <p className="text-sm text-noc-muted">Sin productos todavía.</p>}
        {cart.map((line) => (
          <div key={line.id} className="flex items-center gap-2 border-b border-noc-divider pb-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{line.name}</p>
              <p className="text-[11px] text-noc-muted">{line.sku}</p>
            </div>
            <button
              type="button"
              aria-label={`Quitar uno de ${line.name}`}
              onClick={() => updateQuantity(line.id, line.quantity - 1)}
              className="noc-btn noc-btn-secondary h-11 w-11 min-h-0 px-0"
            >
              –
            </button>
            <span className="w-5 text-center text-sm font-medium">{line.quantity}</span>
            <button
              type="button"
              aria-label={`Agregar uno de ${line.name}`}
              onClick={() => updateQuantity(line.id, line.quantity + 1)}
              className="noc-btn noc-btn-secondary h-11 w-11 min-h-0 px-0"
            >
              +
            </button>
            <span className="w-20 text-right text-sm font-medium">
              {money(Number(line.price) * line.quantity)}
            </span>
          </div>
        ))}

        {/* Cupón + descuento manual */}
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="pos-coupon">
            Código de cupón
          </label>
          <input
            id="pos-coupon"
            value={couponCode}
            onChange={(e) => {
              setCouponCode(e.target.value.toUpperCase());
              setAppliedCoupon(null);
              setCouponError(null);
            }}
            placeholder="Cupón"
            className="noc-input uppercase"
          />
          <button
            type="button"
            onClick={applyCoupon}
            disabled={!couponCode || cart.length === 0}
            className="noc-btn noc-btn-secondary shrink-0"
          >
            Aplicar
          </button>
        </div>
        {couponError && <p className="text-[11px] text-noc-accent-soft">{couponError}</p>}
        {appliedCoupon && (
          <p className="text-[11px] text-noc-accent-soft">
            Cupón {appliedCoupon.code}: -{money(appliedCoupon.discount)}
          </p>
        )}

        <div>
          <label htmlFor="pos-discount" className="mb-1 block text-xs text-noc-muted">
            Descuento manual (%)
          </label>
          <input
            id="pos-discount"
            type="number"
            min={0}
            max={100}
            inputMode="numeric"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            placeholder="Ej: 10"
            className="noc-input"
          />
        </div>

        {/* Método de pago */}
        <fieldset>
          <legend className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-noc-muted">
            Método de pago
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setPaymentMethod(m.value)}
                aria-pressed={paymentMethod === m.value}
                className={`noc-btn ${
                  paymentMethod === m.value ? "noc-btn-primary" : "noc-btn-secondary"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </fieldset>

        {status && (
          <p role="status" className="rounded-lg bg-noc-surface p-3 text-sm">
            {status}{" "}
            {lastSaleId && (
              <Link
                href={`/pos/venta/${lastSaleId}/ticket`}
                target="_blank"
                className="underline underline-offset-4"
              >
                Imprimir ticket
              </Link>
            )}
          </p>
        )}
      </div>

      {/* Total fijo abajo */}
      <div className="sticky bottom-0 flex flex-col gap-1.5 border-t border-noc-divider bg-noc-bg px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
        <div className="flex justify-between text-xs text-noc-muted">
          <span>Subtotal</span>
          <span>{money(subtotal)}</span>
        </div>
        {totalDiscount > 0 && (
          <div className="flex justify-between text-xs text-noc-accent-soft">
            <span>Descuento</span>
            <span>-{money(totalDiscount)}</span>
          </div>
        )}
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium">Total</span>
          <span className="text-2xl font-medium">{money(total)}</span>
        </div>
        <button
          type="button"
          onClick={confirmSale}
          disabled={cart.length === 0 || submitting}
          className="noc-btn noc-btn-primary h-12 w-full text-base"
        >
          {submitting ? "Procesando…" : "Confirmar venta"}
        </button>
      </div>
    </div>
  );
}
