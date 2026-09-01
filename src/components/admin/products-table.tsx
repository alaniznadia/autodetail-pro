"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  categoryName: string;
  variantCount: number;
  totalStock: number;
  active: boolean;
};

export function ProductsTable({ products }: { products: Product[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const allSelected = products.length > 0 && selected.size === products.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(products.map((p) => p.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`¿Borrar ${selected.size} producto${selected.size === 1 ? "" : "s"}? No se puede deshacer.`)) {
      return;
    }

    setDeleting(true);
    const res = await fetch("/api/admin/products/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected) }),
    });
    const data = await res.json().catch(() => ({}));
    setDeleting(false);

    if (!res.ok) {
      alert(typeof data.error === "string" ? data.error : "No se pudo borrar los productos.");
      return;
    }

    const failed: { name: string; error: string }[] = data.failed ?? [];
    if (failed.length > 0) {
      alert(
        `Se borraron ${data.deleted} de ${data.deleted + failed.length}.\n\nNo se pudieron borrar:\n` +
          failed.map((f) => `- ${f.name}: ${f.error}`).join("\n")
      );
    }

    setSelected(new Set());
    router.refresh();
  }

  return (
    <div className="mt-6">
      {selected.size > 0 && (
        <div className="mb-3 flex items-center justify-between rounded border border-red-400/40 p-3">
          <p className="text-sm">{selected.size} seleccionado{selected.size === 1 ? "" : "s"}</p>
          <button
            type="button"
            disabled={deleting}
            onClick={handleBulkDelete}
            className="rounded border border-red-400/40 px-4 py-1.5 font-display text-sm text-red-400 hover:bg-red-400/10 disabled:opacity-50"
          >
            {deleting ? "Borrando..." : "Eliminar seleccionados"}
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border text-foreground/60">
            <tr>
              <th className="w-10 p-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Seleccionar todos los productos"
                  className="h-4 w-4"
                />
              </th>
              <th className="p-3 font-display font-normal">Producto</th>
              <th className="p-3 font-display font-normal">Categoría</th>
              <th className="p-3 font-display font-normal">Variantes</th>
              <th className="p-3 font-display font-normal">Stock total</th>
              <th className="p-3 font-display font-normal">Estado</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggleOne(p.id)}
                    aria-label={`Seleccionar ${p.name}`}
                    className="h-4 w-4"
                  />
                </td>
                <td className="p-3">{p.name}</td>
                <td className="p-3">{p.categoryName}</td>
                <td className="p-3">{p.variantCount}</td>
                <td className="p-3">{p.totalStock}</td>
                <td className="p-3">{p.active ? "Activo" : "Inactivo"}</td>
                <td className="p-3 text-right">
                  <Link href={`/admin/productos/${p.id}/editar`} className="underline underline-offset-4">
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-foreground/60">
                  Todavía no cargaste ningún producto.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
