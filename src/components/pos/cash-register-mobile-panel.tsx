"use client";

/**
 * Caja del día — presentacional, mismo diseño en celular y en escritorio.
 * Los totales llegan ya calculados por `sumPosPaymentsByMethod` (src/lib/cash-register.ts),
 * así que el número que se ve antes de cerrar es el mismo que se guarda al cerrar.
 */

import { useState } from "react";

const money = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");

export type CashTotals = {
  cashTotal: number;
  cardTotal: number;
  mpTotal: number;
  transferTotal: number;
};

export type LowStockItem = { id: string; name: string; quantity: number };

export function CashRegisterMobilePanel({
  locationName,
  openedAt,
  operator,
  totals,
  lowStock = [],
  onClose,
}: {
  locationName: string;
  openedAt: string;
  operator: string;
  totals: CashTotals;
  lowStock?: LowStockItem[];
  onClose: (countedCash: number) => Promise<void> | void;
}) {
  const [counted, setCounted] = useState("");
  const [closing, setClosing] = useState(false);

  const total = totals.cashTotal + totals.cardTotal + totals.mpTotal + totals.transferTotal;
  const countedNumber = Number(counted.replace(/\./g, "").replace(",", ".")) || 0;
  const diff = counted === "" ? 0 : countedNumber - totals.cashTotal;

  const rows: [string, number][] = [
    ["Efectivo", totals.cashTotal],
    ["Tarjeta", totals.cardTotal],
    ["Mercado Pago", totals.mpTotal],
    ["Transferencia", totals.transferTotal],
  ];

  return (
    <div className="noc mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 py-4">
      <div>
        <h1 className="text-lg font-medium">Caja del día</h1>
        <p className="text-[11px] text-noc-muted">
          Abierta {openedAt} · {locationName} · {operator}
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between border-b border-noc-divider pb-2.5">
            <span className="text-sm text-noc-muted">{label}</span>
            <span className="text-sm font-medium">{money(value)}</span>
          </div>
        ))}
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium">Total del turno</span>
          <span className="text-2xl font-medium">{money(total)}</span>
        </div>
      </div>

      <hr className="noc-rule" />

      <div>
        <label htmlFor="counted-cash" className="mb-1 block text-xs text-noc-muted">
          Efectivo contado en caja
        </label>
        <input
          id="counted-cash"
          inputMode="decimal"
          value={counted}
          onChange={(e) => setCounted(e.target.value)}
          placeholder={money(totals.cashTotal)}
          className="noc-input"
        />
      </div>

      <p className="rounded-lg bg-noc-surface p-3 text-[12px] leading-relaxed text-noc-muted">
        {counted === ""
          ? "Contá el efectivo antes de cerrar: al cerrar se guarda el arqueo por método de pago."
          : diff === 0
            ? "Sin diferencia contra lo registrado."
            : `Diferencia de ${money(Math.abs(diff))} ${diff > 0 ? "de más" : "de menos"} contra lo registrado.`}
      </p>

      {lowStock.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.12em] text-noc-muted">
            Alertas de stock
          </h2>
          {lowStock.map((item) => (
            <p key={item.id} className="flex items-center gap-2 text-[13px]">
              <span className="noc-tag noc-tag-accent">{item.quantity}</span>
              {item.name}
            </p>
          ))}
        </section>
      )}

      <button
        type="button"
        disabled={closing}
        onClick={async () => {
          setClosing(true);
          try {
            await onClose(countedNumber);
          } finally {
            setClosing(false);
          }
        }}
        className="noc-btn noc-btn-primary mt-auto h-12 w-full text-base"
      >
        {closing ? "Cerrando…" : "Cerrar caja"}
      </button>
    </div>
  );
}
