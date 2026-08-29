"use client";

/**
 * Puntos Epic Shine — tarjeta de saldo y canje en el checkout.
 * Presentacional: el saldo llega del server (lib/loyalty.ts → getBalance).
 */

import { useState } from "react";

const money = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");

export function LoyaltyBalanceCard({
  balance,
  nextRewardAt,
  pointValue,
}: {
  balance: number;
  nextRewardAt: number;
  pointValue: number;
}) {
  const pct = Math.min(100, Math.round((balance / nextRewardAt) * 100));
  const missing = Math.max(0, nextRewardAt - balance);

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-base">Puntos Epic Shine</h2>
        <span className="rounded border border-accent px-2 py-0.5 text-xs text-accent">
          {balance} pts
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded bg-muted"
        role="progressbar"
        aria-valuenow={balance}
        aria-valuemin={0}
        aria-valuemax={nextRewardAt}
        aria-label="Progreso hacia el próximo beneficio"
      >
        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-foreground/60">
        {missing === 0
          ? `Podés canjear ${money(balance * pointValue)} en tu próxima compra.`
          : `${missing} pts más y tenés ${money(nextRewardAt * pointValue)} de descuento.`}
      </p>
    </section>
  );
}

export function LoyaltyRedeemField({
  balance,
  minRedeem,
  pointValue,
  maxRedeemable,
  onChange,
}: {
  balance: number;
  minRedeem: number;
  pointValue: number;
  /** tope: puntos que cubren como mucho el subtotal del carrito */
  maxRedeemable: number;
  onChange: (points: number) => void;
}) {
  const [points, setPoints] = useState(0);
  const cap = Math.min(balance, maxRedeemable);
  const canRedeem = balance >= minRedeem && cap >= minRedeem;

  if (!canRedeem) {
    return (
      <p className="text-xs text-foreground/60">
        Tenés {balance} pts. El canje mínimo es de {minRedeem} pts.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="loyalty-points" className="text-xs text-foreground/70">
        Canjear puntos (tenés {balance})
      </label>
      <input
        id="loyalty-points"
        type="range"
        min={0}
        max={cap}
        step={minRedeem}
        value={points}
        onChange={(e) => {
          const v = Number(e.target.value);
          setPoints(v);
          onChange(v);
        }}
        className="accent-[var(--accent)]"
      />
      <p className="text-xs text-foreground/60">
        {points === 0
          ? "No canjear puntos en esta compra."
          : `${points} pts = ${money(points * pointValue)} de descuento.`}
      </p>
    </div>
  );
}
