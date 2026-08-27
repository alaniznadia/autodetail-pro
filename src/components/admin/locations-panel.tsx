"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Location = {
  id: string;
  name: string;
  address: string | null;
  active: boolean;
  isMain: boolean;
};

export function LocationsPanel({ locations }: { locations: Location[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/admin/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, address: address || undefined }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo crear la sucursal.");
      return;
    }

    setName("");
    setAddress("");
    router.refresh();
  }

  async function toggleActive(id: string, active: boolean) {
    setError(null);
    const res = await fetch(`/api/admin/locations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo actualizar la sucursal.");
      return;
    }
    router.refresh();
  }

  async function makeMain(id: string) {
    setError(null);
    await fetch(`/api/admin/locations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ makeMain: true }),
    });
    router.refresh();
  }

  return (
    <div>
      <p className="max-w-2xl text-sm text-foreground/70">
        La sucursal principal es la que usa el POS y el checkout online para despachar
        pedidos y descontar stock por defecto. Tiene que haber siempre una activa.
      </p>

      <form onSubmit={handleCreate} className="mt-6 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="location-name" className="block text-sm">
            Nombre
          </label>
          <input
            id="location-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Local Centro"
            className="mt-1 rounded border border-border bg-background px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="location-address" className="block text-sm">
            Dirección (opcional)
          </label>
          <input
            id="location-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="mt-1 rounded border border-border bg-background px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded border border-accent px-4 py-2 font-display text-sm hover:bg-accent hover:text-background disabled:opacity-50"
        >
          {submitting ? "Guardando..." : "Agregar sucursal"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="mt-8 overflow-x-auto rounded border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-border text-foreground/60">
            <tr>
              <th className="p-3 font-display font-normal">Nombre</th>
              <th className="p-3 font-display font-normal">Dirección</th>
              <th className="p-3 font-display font-normal">Estado</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {locations.map((l) => (
              <tr key={l.id} className="border-b border-border last:border-0">
                <td className="p-3">
                  {l.name}
                  {l.isMain && (
                    <span className="ml-2 rounded border border-accent px-2 py-0.5 text-xs">
                      Principal
                    </span>
                  )}
                </td>
                <td className="p-3">{l.address ?? "—"}</td>
                <td className="p-3">{l.active ? "Activa" : "Inactiva"}</td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-3">
                    {!l.isMain && l.active && (
                      <button
                        type="button"
                        onClick={() => makeMain(l.id)}
                        className="text-sm underline underline-offset-4"
                      >
                        Marcar como principal
                      </button>
                    )}
                    {!l.isMain && (
                      <button
                        type="button"
                        onClick={() => toggleActive(l.id, !l.active)}
                        className="text-sm underline underline-offset-4"
                      >
                        {l.active ? "Desactivar" : "Activar"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {locations.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-foreground/60">
                  Todavía no hay sucursales cargadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
