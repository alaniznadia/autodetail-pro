"use client";

/**
 * Glue entre los endpoints existentes de caja (/api/pos/caja*) y el panel
 * presentacional (CashRegisterMobilePanel). Mismo flujo abrir → operar →
 * cerrar, sin cambios de API. Mismo diseño en celular y en escritorio.
 */

import { useEffect, useState } from "react";
import { CashRegisterMobilePanel, type CashTotals, type LowStockItem } from "@/components/pos/cash-register-mobile-panel";

type Session = { id: string; openingAmount: string; openedAt: string };

type CajaState = {
  session: Session | null;
  totals: CashTotals | null;
  locationName: string;
  operatorName: string;
  lowStock: LowStockItem[];
};

export function CashRegisterMobile({ locationId }: { locationId: string }) {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<CajaState | null>(null);
  const [openingAmount, setOpeningAmount] = useState("0");
  const [error, setError] = useState<string | null>(null);

  async function loadStatus() {
    setLoading(true);
    const res = await fetch(`/api/pos/caja?locationId=${locationId}`);
    const data = await res.json();
    setState({
      session: data.session,
      totals: data.totals
        ? {
            cashTotal: Number(data.totals.cashTotal),
            cardTotal: Number(data.totals.cardTotal),
            mpTotal: Number(data.totals.mpTotal),
            transferTotal: Number(data.totals.transferTotal),
          }
        : null,
      locationName: data.locationName ?? "",
      operatorName: data.operatorName ?? "",
      lowStock: data.lowStock ?? [],
    });
    setLoading(false);
  }

  useEffect(() => {
    // Carga el estado de la caja al montar; loadStatus depende de
    // locationId, que ya está en el array de dependencias.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  async function handleOpen(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/pos/caja/abrir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId, openingAmount: Number(openingAmount) }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo abrir la caja.");
      return;
    }
    await loadStatus();
  }

  async function handleClose(countedCash: number) {
    if (!state?.session) return;
    setError(null);
    const res = await fetch("/api/pos/caja/cerrar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: state.session.id, closingAmount: countedCash }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo cerrar la caja.");
      return;
    }
    await loadStatus();
  }

  if (loading) return <p className="p-4 text-sm text-foreground/60">Cargando...</p>;

  if (!state?.session) {
    return (
      <div className="noc mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 py-4 lg:max-w-lg lg:py-8">
        <h1 className="text-lg font-medium">Caja del día</h1>
        <p className="text-sm text-noc-muted">No hay ninguna caja abierta.</p>
        {error && <p className="text-sm text-noc-accent-soft">{error}</p>}
        <form onSubmit={handleOpen} className="flex flex-col gap-3">
          <div>
            <label htmlFor="mobile-opening-amount" className="mb-1 block text-xs text-noc-muted">
              Monto inicial en efectivo
            </label>
            <input
              id="mobile-opening-amount"
              type="number"
              min={0}
              inputMode="decimal"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
              className="noc-input"
            />
          </div>
          <button type="submit" className="noc-btn noc-btn-primary h-12 w-full text-base">
            Abrir caja
          </button>
        </form>
      </div>
    );
  }

  return (
    <>
      {error && (
        <p role="alert" className="noc mx-auto max-w-md bg-noc-bg px-4 pt-4 text-sm text-noc-accent-soft">
          {error}
        </p>
      )}
      <CashRegisterMobilePanel
        locationName={state.locationName}
        openedAt={new Date(state.session.openedAt).toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
        })}
        operator={state.operatorName}
        totals={
          state.totals ?? { cashTotal: 0, cardTotal: 0, mpTotal: 0, transferTotal: 0 }
        }
        lowStock={state.lowStock}
        onClose={handleClose}
      />
    </>
  );
}
