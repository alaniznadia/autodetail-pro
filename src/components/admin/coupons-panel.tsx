"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Coupon = {
  id: string;
  code: string;
  percentOff: number | null;
  amountOff: string | null;
  minOrderTotal: string | null;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  expiresAt: string | null;
};

export function CouponsPanel({ coupons }: { coupons: Coupon[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");
  const [discountValue, setDiscountValue] = useState("10");
  const [minOrderTotal, setMinOrderTotal] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        percentOff: discountType === "percent" ? Number(discountValue) : undefined,
        amountOff: discountType === "amount" ? Number(discountValue) : undefined,
        minOrderTotal: minOrderTotal ? Number(minOrderTotal) : undefined,
        maxUses: maxUses ? Number(maxUses) : undefined,
        expiresAt: expiresAt || undefined,
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo crear el cupón.");
      return;
    }

    setCode("");
    setDiscountValue("10");
    setMinOrderTotal("");
    setMaxUses("");
    setExpiresAt("");
    setShowForm(false);
    router.refresh();
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/admin/coupons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Cupones</h1>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded border border-accent px-4 py-2 font-display text-sm hover:bg-accent hover:text-background"
        >
          {showForm ? "Cancelar" : "+ Nuevo cupón"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mt-6 flex max-w-md flex-col gap-4">
          <div>
            <label htmlFor="code" className="block text-sm">
              Código
            </label>
            <input
              id="code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="BIENVENIDA10"
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2 uppercase"
            />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={discountType === "percent"}
                onChange={() => setDiscountType("percent")}
              />
              Porcentaje
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={discountType === "amount"}
                onChange={() => setDiscountType("amount")}
              />
              Monto fijo
            </label>
          </div>
          <div>
            <label htmlFor="discountValue" className="block text-sm">
              {discountType === "percent" ? "Porcentaje de descuento" : "Monto de descuento"}
            </label>
            <input
              id="discountValue"
              type="number"
              min={1}
              max={discountType === "percent" ? 100 : undefined}
              required
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="minOrderTotal" className="block text-sm">
              Compra mínima (opcional)
            </label>
            <input
              id="minOrderTotal"
              type="number"
              min={0}
              value={minOrderTotal}
              onChange={(e) => setMinOrderTotal(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="maxUses" className="block text-sm">
              Usos máximos (opcional)
            </label>
            <input
              id="maxUses"
              type="number"
              min={1}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="expiresAt" className="block text-sm">
              Vence (opcional)
            </label>
            <input
              id="expiresAt"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-fit rounded border border-accent px-6 py-2 font-display text-sm hover:bg-accent hover:text-background disabled:opacity-50"
          >
            {submitting ? "Guardando..." : "Crear cupón"}
          </button>
        </form>
      )}

      <div className="mt-8 overflow-x-auto rounded border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-border text-foreground/60">
            <tr>
              <th className="p-3 font-display font-normal">Código</th>
              <th className="p-3 font-display font-normal">Descuento</th>
              <th className="p-3 font-display font-normal">Usos</th>
              <th className="p-3 font-display font-normal">Vence</th>
              <th className="p-3 font-display font-normal">Estado</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="p-3 font-display">{c.code}</td>
                <td className="p-3">
                  {c.percentOff ? `${c.percentOff}%` : `$${c.amountOff}`}
                </td>
                <td className="p-3">
                  {c.usedCount}
                  {c.maxUses ? ` / ${c.maxUses}` : ""}
                </td>
                <td className="p-3">
                  {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("es-AR") : "—"}
                </td>
                <td className="p-3">{c.active ? "Activo" : "Inactivo"}</td>
                <td className="p-3 text-right">
                  <button
                    type="button"
                    onClick={() => toggleActive(c.id, !c.active)}
                    className="text-sm underline underline-offset-4"
                  >
                    {c.active ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-foreground/60">
                  Todavía no creaste ningún cupón.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
