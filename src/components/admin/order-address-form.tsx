"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Address = {
  street: string;
  number: string;
  floorApt: string | null;
  city: string;
  province: string;
  postalCode: string;
};

export function OrderAddressForm({ orderId, address }: { orderId: string; address: Address | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(!address);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    street: address?.street ?? "",
    number: address?.number ?? "",
    floorApt: address?.floorApt ?? "",
    city: address?.city ?? "",
    province: address?.province ?? "",
    postalCode: address?.postalCode ?? "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/admin/orders/${orderId}/address`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo guardar la dirección.");
      return;
    }

    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="mt-1 text-sm text-foreground/70">
        <p>
          {address?.street} {address?.number}
          {address?.floorApt ? `, ${address.floorApt}` : ""}, {address?.city}, {address?.province} (
          {address?.postalCode})
        </p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-1 text-xs underline underline-offset-4"
        >
          Editar dirección
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 grid gap-2 sm:grid-cols-2">
      <p className="text-xs text-foreground/60 sm:col-span-2">
        Cargá la dirección que te pasó el cliente por WhatsApp.
      </p>
      <input
        required
        placeholder="Calle"
        value={form.street}
        onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
        className="rounded border border-border bg-background px-2 py-1 text-sm sm:col-span-2"
      />
      <input
        required
        placeholder="Número"
        value={form.number}
        onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
        className="rounded border border-border bg-background px-2 py-1 text-sm"
      />
      <input
        placeholder="Piso/depto (opcional)"
        value={form.floorApt}
        onChange={(e) => setForm((f) => ({ ...f, floorApt: e.target.value }))}
        className="rounded border border-border bg-background px-2 py-1 text-sm"
      />
      <input
        required
        placeholder="Ciudad"
        value={form.city}
        onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
        className="rounded border border-border bg-background px-2 py-1 text-sm"
      />
      <input
        required
        placeholder="Provincia"
        value={form.province}
        onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
        className="rounded border border-border bg-background px-2 py-1 text-sm"
      />
      <input
        required
        placeholder="Código postal"
        value={form.postalCode}
        onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
        className="rounded border border-border bg-background px-2 py-1 text-sm sm:col-span-2"
      />
      {error && (
        <p role="alert" className="text-sm text-red-400 sm:col-span-2">
          {error}
        </p>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded border border-accent px-3 py-1 text-xs hover:bg-accent hover:text-background disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar dirección"}
        </button>
        {address && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded border border-border px-3 py-1 text-xs hover:border-accent"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
