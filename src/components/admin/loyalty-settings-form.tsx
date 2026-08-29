"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Initial = {
  loyaltyEnabled: boolean;
  loyaltyArsPerPoint: number;
  loyaltyPointValue: string;
  loyaltyMinRedeem: number;
};

export function LoyaltySettingsForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial.loyaltyEnabled);
  const [arsPerPoint, setArsPerPoint] = useState(String(initial.loyaltyArsPerPoint));
  const [pointValue, setPointValue] = useState(initial.loyaltyPointValue);
  const [minRedeem, setMinRedeem] = useState(String(initial.loyaltyMinRedeem));
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
      body: JSON.stringify({
        loyaltyEnabled: enabled,
        loyaltyArsPerPoint: Number(arsPerPoint),
        loyaltyPointValue: Number(pointValue),
        loyaltyMinRedeem: Number(minRedeem),
      }),
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
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            setEnabled(e.target.checked);
            setSaved(false);
          }}
        />
        Activar puntos Epic Shine
      </label>

      <div>
        <label htmlFor="loyalty-ars-per-point" className="block text-sm">
          Pesos pagados por cada punto
        </label>
        <input
          id="loyalty-ars-per-point"
          type="number"
          min={1}
          value={arsPerPoint}
          onChange={(e) => {
            setArsPerPoint(e.target.value);
            setSaved(false);
          }}
          className="mt-1 w-full max-w-xs rounded border border-border bg-background px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="loyalty-point-value" className="block text-sm">
          Valor de 1 punto al canjear
        </label>
        <input
          id="loyalty-point-value"
          type="number"
          min={0.01}
          step="0.01"
          value={pointValue}
          onChange={(e) => {
            setPointValue(e.target.value);
            setSaved(false);
          }}
          className="mt-1 w-full max-w-xs rounded border border-border bg-background px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="loyalty-min-redeem" className="block text-sm">
          Mínimo de puntos para poder canjear
        </label>
        <input
          id="loyalty-min-redeem"
          type="number"
          min={1}
          value={minRedeem}
          onChange={(e) => {
            setMinRedeem(e.target.value);
            setSaved(false);
          }}
          className="mt-1 w-full max-w-xs rounded border border-border bg-background px-3 py-2"
        />
      </div>

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
        disabled={submitting}
        className="w-fit rounded border border-accent px-6 py-2 font-display text-sm hover:bg-accent hover:text-background disabled:opacity-50"
      >
        {submitting ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
