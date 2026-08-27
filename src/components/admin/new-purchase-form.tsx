"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SearchResult = {
  id: string;
  sku: string;
  name: string;
  price: string;
};

type Line = SearchResult & { quantity: number; unitCost: string };

type Supplier = { id: string; name: string };

export function NewPurchaseForm({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSearch(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    const res = await fetch(`/api/products/search?q=${encodeURIComponent(value)}`);
    const data = await res.json();
    setResults(data.results);
  }

  function addLine(product: SearchResult) {
    setLines((prev) => {
      if (prev.some((l) => l.id === product.id)) return prev;
      return [...prev, { ...product, quantity: 1, unitCost: "0" }];
    });
    setQuery("");
    setResults([]);
  }

  function updateLine(id: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  const totalCost = lines.reduce((sum, l) => sum + Number(l.unitCost) * l.quantity, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lines.length === 0) return;
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/admin/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId,
        notes: notes || undefined,
        items: lines.map((l) => ({
          variantId: l.id,
          quantity: l.quantity,
          unitCost: Number(l.unitCost),
        })),
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo registrar la compra.");
      return;
    }

    router.push("/admin/compras");
    router.refresh();
  }

  if (suppliers.length === 0) {
    return (
      <p className="text-foreground/70">
        Primero necesitás cargar un proveedor en{" "}
        <a href="/admin/proveedores" className="underline underline-offset-4">
          Proveedores
        </a>
        .
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex max-w-2xl flex-col gap-6">
      <div>
        <label htmlFor="supplier" className="block font-display text-sm">
          Proveedor
        </label>
        <select
          id="supplier"
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
        >
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="purchase-search" className="block font-display text-sm">
          Buscar producto
        </label>
        <input
          id="purchase-search"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
          placeholder="Nombre o SKU..."
        />
        {results.length > 0 && (
          <ul className="mt-2 divide-y divide-border rounded border border-border">
            {results.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => addLine(r)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <span>{r.name}</span>
                  <span className="text-xs text-foreground/50">{r.sku}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {lines.length > 0 && (
        <div className="rounded border border-border">
          {lines.map((line) => (
            <div
              key={line.id}
              className="flex flex-wrap items-center gap-3 border-b border-border p-3 last:border-0"
            >
              <span className="flex-1 text-sm">{line.name}</span>
              <label className="text-xs text-foreground/60">
                Cant.
                <input
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) => updateLine(line.id, { quantity: Number(e.target.value) })}
                  className="ml-2 w-16 rounded border border-border bg-background px-2 py-1"
                />
              </label>
              <label className="text-xs text-foreground/60">
                Costo unit.
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={line.unitCost}
                  onChange={(e) => updateLine(line.id, { unitCost: e.target.value })}
                  className="ml-2 w-24 rounded border border-border bg-background px-2 py-1"
                />
              </label>
              <button
                type="button"
                onClick={() => removeLine(line.id)}
                className="text-xs text-red-400 underline underline-offset-4"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}

      <div>
        <label htmlFor="notes" className="block font-display text-sm">
          Notas (opcional)
        </label>
        <textarea
          id="notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
        />
      </div>

      <p className="font-display text-lg">Total: ${totalCost.toFixed(2)}</p>

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={lines.length === 0 || submitting}
        className="w-fit rounded border border-accent px-6 py-2 font-display text-sm hover:bg-accent hover:text-background disabled:opacity-50"
      >
        {submitting ? "Guardando..." : "Registrar compra"}
      </button>
    </form>
  );
}
