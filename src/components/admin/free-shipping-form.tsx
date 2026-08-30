"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FreeShippingForm({ initial }: { initial: string | null }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial !== null);
  const [amount, setAmount] = useState(initial ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/admin/store-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ freeShippingFrom: enabled ? Number(amount) : null }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo guardar.");
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            setEnabled(e.target.checked);
            setSaved(false);
          }}
        />
        Ofrecer envío gratis a partir de un monto
      </label>
      <p className="text-xs text-foreground/60">
        El envío se coordina y se cobra por WhatsApp después del pago; esto solo afecta el
        monto de referencia que ven vos y el cliente, no lo que cobra Mercado Pago.
      </p>

      {enabled && (
        <div>
          <label htmlFor="free-shipping-amount" className="block text-sm">
            Envío gratis desde
          </label>
          <input
            id="free-shipping-amount"
            type="number"
            min={0}
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setSaved(false);
            }}
            placeholder="Ej: 50000"
            className="mt-1 w-full max-w-xs rounded border border-border bg-background px-3 py-2"
          />
          <p className="mt-1 text-xs text-foreground/60">
            Se mide sobre el subtotal ya con descuentos aplicados.
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      {saved && !error && (
        <p role="status" className="text-sm text-green-500">
          Cambios guardados.
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || (enabled && !amount)}
        className="w-fit rounded border border-accent px-6 py-2 font-display text-sm hover:bg-accent hover:text-background disabled:opacity-50"
      >
        {submitting ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
