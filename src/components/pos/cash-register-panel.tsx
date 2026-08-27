"use client";

import { useEffect, useState } from "react";

type Totals = {
  cashTotal: string;
  cardTotal: string;
  mpTotal: string;
  transferTotal: string;
};

type Session = {
  id: string;
  openingAmount: string;
  openedAt: string;
};

export function CashRegisterPanel({ locationId }: { locationId: string }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [openingAmount, setOpeningAmount] = useState("0");
  const [closingAmount, setClosingAmount] = useState("0");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastClosed, setLastClosed] = useState<null | (Session & Totals & { closingAmount: string })>(
    null
  );

  async function loadStatus() {
    setLoading(true);
    const res = await fetch(`/api/pos/caja?locationId=${locationId}`);
    const data = await res.json();
    setSession(data.session);
    setTotals(data.totals ?? null);
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

  async function handleClose(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setError(null);
    const res = await fetch("/api/pos/caja/cerrar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: session.id,
        closingAmount: Number(closingAmount),
        notes: notes || undefined,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo cerrar la caja.");
      return;
    }
    const { session: closedSession } = await res.json();
    setLastClosed(closedSession);
    setNotes("");
    await loadStatus();
  }

  if (loading) return <p className="text-sm text-foreground/60">Cargando...</p>;

  const expectedCash =
    session && totals ? Number(session.openingAmount) + Number(totals.cashTotal) : 0;

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl font-bold">Caja</h1>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {error}
        </p>
      )}

      {!session ? (
        <form onSubmit={handleOpen} className="mt-6 flex flex-col gap-4">
          <p className="text-sm text-foreground/70">No hay ninguna caja abierta.</p>
          <div>
            <label htmlFor="openingAmount" className="block font-display text-sm">
              Monto inicial en efectivo
            </label>
            <input
              id="openingAmount"
              type="number"
              min={0}
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            />
          </div>
          <button
            type="submit"
            className="w-fit rounded border border-accent px-6 py-2 font-display text-sm hover:bg-accent hover:text-background"
          >
            Abrir caja
          </button>
        </form>
      ) : (
        <form onSubmit={handleClose} className="mt-6 flex flex-col gap-4">
          <p className="text-sm text-foreground/70">
            Caja abierta desde {new Date(session.openedAt).toLocaleString("es-AR")} con $
            {session.openingAmount}.
          </p>

          <div className="rounded border border-border p-4 text-sm">
            <p className="flex justify-between">
              <span>Efectivo (ventas)</span>
              <span>${totals?.cashTotal ?? "0"}</span>
            </p>
            <p className="flex justify-between">
              <span>Tarjeta</span>
              <span>${totals?.cardTotal ?? "0"}</span>
            </p>
            <p className="flex justify-between">
              <span>Mercado Pago</span>
              <span>${totals?.mpTotal ?? "0"}</span>
            </p>
            <p className="flex justify-between">
              <span>Transferencia</span>
              <span>${totals?.transferTotal ?? "0"}</span>
            </p>
            <p className="mt-2 flex justify-between font-display">
              <span>Efectivo esperado en caja</span>
              <span>${expectedCash.toFixed(2)}</span>
            </p>
          </div>

          <div>
            <label htmlFor="closingAmount" className="block font-display text-sm">
              Efectivo contado al cierre
            </label>
            <input
              id="closingAmount"
              type="number"
              min={0}
              value={closingAmount}
              onChange={(e) => setClosingAmount(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block font-display text-sm">
              Notas (opcional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            />
          </div>

          <button
            type="submit"
            className="w-fit rounded border border-accent px-6 py-2 font-display text-sm hover:bg-accent hover:text-background"
          >
            Cerrar caja
          </button>
        </form>
      )}

      {lastClosed && (
        <div className="mt-8 rounded border border-border p-4 text-sm">
          <p className="font-display">Última caja cerrada</p>
          <p className="mt-2 flex justify-between">
            <span>Contado</span>
            <span>${lastClosed.closingAmount}</span>
          </p>
        </div>
      )}
    </div>
  );
}
