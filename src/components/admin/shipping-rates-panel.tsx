"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Rate = {
  id: string;
  name: string;
  maxWeightGr: number;
  cost: string;
  active: boolean;
};

export function ShippingRatesPanel({ rates }: { rates: Rate[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [maxWeightGr, setMaxWeightGr] = useState("1000");
  const [cost, setCost] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/admin/shipping-rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, maxWeightGr: Number(maxWeightGr), cost: Number(cost) }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo crear el tramo.");
      return;
    }

    setName("");
    setMaxWeightGr("1000");
    setCost("0");
    router.refresh();
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/admin/shipping-rates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    router.refresh();
  }

  return (
    <div>
      <p className="max-w-2xl text-sm text-foreground/70">
        El costo de envío se calcula sumando el peso de los productos del carrito y
        aplicando el tramo cuyo peso máximo alcance. Cargá los tramos de menor a mayor
        peso; el último tramo activo se usa también para todo lo que pese más.
      </p>

      <form onSubmit={handleCreate} className="mt-6 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="rate-name" className="block text-sm">
            Nombre
          </label>
          <input
            id="rate-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Hasta 1kg"
            className="mt-1 rounded border border-border bg-background px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="rate-weight" className="block text-sm">
            Peso máximo (gramos)
          </label>
          <input
            id="rate-weight"
            type="number"
            min={1}
            required
            value={maxWeightGr}
            onChange={(e) => setMaxWeightGr(e.target.value)}
            className="mt-1 rounded border border-border bg-background px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="rate-cost" className="block text-sm">
            Costo
          </label>
          <input
            id="rate-cost"
            type="number"
            min={0}
            step="0.01"
            required
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className="mt-1 rounded border border-border bg-background px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded border border-accent px-4 py-2 font-display text-sm hover:bg-accent hover:text-background disabled:opacity-50"
        >
          {submitting ? "Guardando..." : "Agregar tramo"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="mt-8 overflow-x-auto rounded border border-border">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="border-b border-border text-foreground/60">
            <tr>
              <th className="p-3 font-display font-normal">Nombre</th>
              <th className="p-3 font-display font-normal">Hasta</th>
              <th className="p-3 font-display font-normal">Costo</th>
              <th className="p-3 font-display font-normal">Estado</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rates.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="p-3">{r.name}</td>
                <td className="p-3">{(r.maxWeightGr / 1000).toFixed(2)} kg</td>
                <td className="p-3">${r.cost}</td>
                <td className="p-3">{r.active ? "Activo" : "Inactivo"}</td>
                <td className="p-3 text-right">
                  <button
                    type="button"
                    onClick={() => toggleActive(r.id, !r.active)}
                    className="text-sm underline underline-offset-4"
                  >
                    {r.active ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
            {rates.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-foreground/60">
                  Todavía no cargaste ningún tramo de envío.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
