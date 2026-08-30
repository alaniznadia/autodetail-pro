"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/store/cart-context";
import { useAdaptiveFrameBg } from "@/components/store/use-adaptive-frame-bg";

const money = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");

export function CartView({
  freeShippingFrom,
  loyaltyEnabled,
  loyaltyArsPerPoint,
}: {
  freeShippingFrom: number | null;
  loyaltyEnabled: boolean;
  loyaltyArsPerPoint: number;
}) {
  const { items, updateQuantity, removeItem, subtotal } = useCart();
  const [couponCode, setCouponCode] = useState("");
  const [couponState, setCouponState] = useState<
    { status: "idle" } | { status: "loading" } | { status: "ok"; discount: number } | { status: "error"; message: string }
  >({ status: "idle" });

  async function applyCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponState({ status: "loading" });
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), subtotal }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponState({ status: "error", message: typeof data.error === "string" ? data.error : "Cupón inválido." });
        return;
      }
      setCouponState({ status: "ok", discount: Number(data.discountTotal) });
    } catch {
      setCouponState({ status: "error", message: "No se pudo validar el cupón." });
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-[560px] px-4 py-20 text-center">
        <h1 className="text-2xl font-medium">Tu carrito está vacío</h1>
        <p className="mt-2 text-sm text-foreground/60">Todavía no agregaste productos.</p>
        <Link
          href="/catalogo"
          className="store-frame mt-8 inline-block border-accent px-7 py-3 text-sm text-accent hover:bg-accent/10"
        >
          Ver catálogo
        </Link>
      </div>
    );
  }

  const discount = couponState.status === "ok" ? couponState.discount : 0;
  const total = Math.max(0, subtotal - discount);
  const missingForFreeShipping = freeShippingFrom ? Math.max(0, freeShippingFrom - total) : 0;
  const pointsEarned = loyaltyEnabled ? Math.floor(total / loyaltyArsPerPoint) : 0;

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-9 px-4 pb-14 sm:px-8 lg:flex-row">
      <div className="min-w-0 flex-1">
        <h1 className="mb-6 text-2xl font-medium tracking-[-0.02em]">Tu carrito</h1>
        <ul className="store-frame flex flex-col divide-y divide-border border-border">
          {items.map((item) => (
            <li key={item.variantId} className="flex items-center gap-4 p-4">
              <CartItemThumb imageUrl={item.imageUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px]">
                  {item.productName}
                  {item.variantName && item.variantName !== "Único" ? ` · ${item.variantName}` : ""}
                </p>
                <p className="text-[12px] text-foreground/50">{money(Number(item.price))} c/u</p>
                <button
                  type="button"
                  onClick={() => removeItem(item.variantId)}
                  aria-label={`Quitar ${item.productName} del carrito`}
                  className="mt-1 text-xs text-foreground/50 underline underline-offset-2 hover:text-foreground"
                >
                  Quitar
                </button>
              </div>
              <div className="store-frame flex h-10 items-center border-border">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                  aria-label={`Quitar una unidad de ${item.productName}`}
                  className="h-full w-9 text-base"
                >
                  −
                </button>
                <span className="w-7 text-center text-sm" aria-live="polite">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                  aria-label={`Agregar una unidad de ${item.productName}`}
                  className="h-full w-9 text-base"
                >
                  +
                </button>
              </div>
              <p className="w-20 shrink-0 text-right text-[13.5px]">
                {money(Number(item.price) * item.quantity)}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <aside className="store-frame flex w-full shrink-0 flex-col gap-4 self-start border-border p-5 lg:sticky lg:top-[88px] lg:w-[320px]">
        <form onSubmit={applyCoupon} className="flex flex-col gap-2">
          <label htmlFor="coupon" className="text-[10px] uppercase tracking-[0.14em] text-foreground/45">
            Cupón de descuento
          </label>
          <div className="flex gap-2">
            <input
              id="coupon"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="CÓDIGO"
              className="store-frame h-10 flex-1 border-border bg-background px-3 text-sm outline-none focus-visible:border-accent"
            />
            <button
              type="submit"
              disabled={couponState.status === "loading"}
              className="store-frame h-10 shrink-0 border-border px-4 text-sm hover:bg-foreground/5 disabled:opacity-50"
            >
              Aplicar
            </button>
          </div>
          {couponState.status === "error" ? (
            <p className="text-xs text-red-400">{couponState.message}</p>
          ) : null}
          {couponState.status === "ok" ? (
            <p className="text-xs text-accent">Cupón aplicado: −{money(couponState.discount)}</p>
          ) : null}
        </form>

        <hr className="h-px border-0 bg-[linear-gradient(to_right,transparent,var(--color-border)_12px,var(--color-border)_calc(100%-12px),transparent)]" />

        <div className="flex flex-col gap-2 text-sm">
          <Row label="Subtotal" value={money(subtotal)} />
          {discount > 0 ? <Row label="Descuento" value={`−${money(discount)}`} accent /> : null}
          <p className="text-xs text-foreground/50">El envío se calcula en el checkout.</p>
        </div>

        <hr className="h-px border-0 bg-[linear-gradient(to_right,transparent,var(--color-border)_12px,var(--color-border)_calc(100%-12px),transparent)]" />

        <div className="flex items-baseline justify-between">
          <span className="text-sm">Total</span>
          <span className="text-xl tracking-[-0.02em]">{money(total)}</span>
        </div>

        {freeShippingFrom && missingForFreeShipping > 0 ? (
          <p className="text-xs text-foreground/50">
            Te faltan {money(missingForFreeShipping)} para envío gratis.
          </p>
        ) : null}

        <Link
          href="/checkout"
          className="store-frame mt-2 flex h-[46px] items-center justify-center border-accent text-sm text-accent hover:bg-accent/10"
        >
          Finalizar compra
        </Link>

        {loyaltyEnabled && pointsEarned > 0 ? (
          <p className="text-xs text-foreground/50">Sumás {pointsEarned} puntos con esta compra.</p>
        ) : null}
      </aside>
    </div>
  );
}

function CartItemThumb({ imageUrl }: { imageUrl?: string }) {
  const { bg, imgRef } = useAdaptiveFrameBg();
  return (
    <div
      className="store-frame h-16 w-16 shrink-0 overflow-hidden border-border bg-surface"
      style={bg ? { backgroundColor: bg } : undefined}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={imageUrl}
          alt=""
          crossOrigin="anonymous"
          className="h-full w-full object-contain p-1.5"
        />
      ) : null}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-foreground/60">{label}</span>
      <span className={accent ? "text-accent" : ""}>{value}</span>
    </div>
  );
}
