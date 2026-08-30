"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";

type Supplier = { id: string; name: string };

type MatchSuggestion = { variantId: string; label: string; sku: string; confidence: number };

type ExtractedItem = {
  rawName: string;
  quantity: number;
  unitCost: number | null;
  sku: string | null;
  barcode: string | null;
  suggestions: MatchSuggestion[];
};

type SearchResult = { id: string; sku: string; name: string; price: string };

type ReviewLine = {
  key: string;
  rawName: string;
  quantity: number;
  unitCost: string;
  variantId: string | null;
  variantLabel: string | null;
  confidence: number | null;
  suggestions: MatchSuggestion[];
  omitted: boolean;
  searchQuery: string;
  searchResults: SearchResult[];
};

// A partir de acá se preselecciona la mejor sugerencia automáticamente; por
// debajo, el admin tiene que elegir a mano (misma idea que AUTO_MATCH_THRESHOLD
// en lib/product-matching.ts).
const AUTO_MATCH_THRESHOLD = 0.55;

function confidenceLabel(confidence: number | null): { text: string; className: string } {
  if (confidence === null) return { text: "Sin coincidencia", className: "text-red-400" };
  if (confidence >= 0.85) return { text: "Coincidencia exacta", className: "text-green-400" };
  if (confidence >= AUTO_MATCH_THRESHOLD) return { text: "Probable", className: "text-yellow-400" };
  return { text: "Poco confiable", className: "text-red-400" };
}

export function ImportRemitoForm({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter();
  const fileInputId = useId();
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  const [sourceFileUrl, setSourceFileUrl] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<string | null>(null);
  const [supplierGuess, setSupplierGuess] = useState<string | null>(null);
  const [documentDate, setDocumentDate] = useState<string | null>(null);
  const [lines, setLines] = useState<ReviewLine[] | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleExtract(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setExtracting(true);
    setExtractError(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/admin/purchases/import", { method: "POST", body: formData });
    const data = await res.json().catch(() => ({}));
    setExtracting(false);

    if (!res.ok) {
      setExtractError(typeof data.error === "string" ? data.error : "No se pudo leer el remito.");
      return;
    }

    setSourceFileUrl(data.sourceFileUrl);
    setSourceType(data.sourceType);
    setSupplierGuess(data.supplierGuess ?? null);
    setDocumentDate(data.documentDate ?? null);

    const items: ExtractedItem[] = data.items ?? [];
    setLines(
      items.map((item, index) => {
        const best = item.suggestions[0] ?? null;
        const autoMatched = best && best.confidence >= AUTO_MATCH_THRESHOLD;
        return {
          key: `${index}-${item.rawName}`,
          rawName: item.rawName,
          quantity: item.quantity,
          unitCost: item.unitCost !== null ? String(item.unitCost) : "0",
          variantId: autoMatched ? best.variantId : null,
          variantLabel: autoMatched ? best.label : null,
          confidence: autoMatched ? best.confidence : null,
          suggestions: item.suggestions,
          omitted: false,
          searchQuery: "",
          searchResults: [],
        };
      })
    );
  }

  function updateLine(key: string, patch: Partial<ReviewLine>) {
    setLines((prev) => (prev ? prev.map((l) => (l.key === key ? { ...l, ...patch } : l)) : prev));
  }

  function pickSuggestion(key: string, suggestion: MatchSuggestion) {
    updateLine(key, {
      variantId: suggestion.variantId,
      variantLabel: suggestion.label,
      confidence: suggestion.confidence,
      searchQuery: "",
      searchResults: [],
    });
  }

  async function handleLineSearch(key: string, value: string) {
    updateLine(key, { searchQuery: value });
    if (value.trim().length < 2) {
      updateLine(key, { searchResults: [] });
      return;
    }
    const res = await fetch(`/api/products/search?q=${encodeURIComponent(value)}`);
    const data = await res.json();
    updateLine(key, { searchResults: data.results ?? [] });
  }

  function pickSearchResult(key: string, result: SearchResult) {
    updateLine(key, {
      variantId: result.id,
      variantLabel: result.name,
      confidence: null,
      searchQuery: "",
      searchResults: [],
    });
  }

  const activeLines = (lines ?? []).filter((l) => !l.omitted);
  const pendingMatches = activeLines.filter((l) => !l.variantId).length;
  const totalCost = activeLines.reduce((sum, l) => sum + Number(l.unitCost) * l.quantity, 0);

  async function handleConfirm() {
    if (!lines || activeLines.length === 0 || pendingMatches > 0) return;
    setSubmitting(true);
    setSubmitError(null);

    const noteParts = ["Importado desde remito con IA."];
    if (supplierGuess) noteParts.push(`Proveedor en el documento: ${supplierGuess}.`);
    if (documentDate) noteParts.push(`Fecha del documento: ${documentDate}.`);

    const res = await fetch("/api/admin/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId,
        notes: noteParts.join(" "),
        sourceFileUrl: sourceFileUrl ?? undefined,
        sourceType: sourceType ?? undefined,
        items: activeLines.map((l) => ({
          variantId: l.variantId,
          quantity: l.quantity,
          unitCost: Number(l.unitCost),
        })),
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSubmitError(typeof data.error === "string" ? data.error : "No se pudo registrar la compra.");
      return;
    }

    router.push("/admin/compras");
    router.refresh();
  }

  if (suppliers.length === 0) {
    return (
      <p className="mt-6 text-foreground/70">
        Primero necesitás cargar un proveedor en{" "}
        <a href="/admin/proveedores" className="underline underline-offset-4">
          Proveedores
        </a>
        .
      </p>
    );
  }

  // Paso 1: elegir proveedor y subir el archivo.
  if (!lines) {
    return (
      <form onSubmit={handleExtract} className="mt-6 flex max-w-2xl flex-col gap-6">
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
          <label htmlFor={fileInputId} className="block font-display text-sm">
            Remito (PDF) o foto del ticket
          </label>
          <input
            id={fileInputId}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-foreground/50">PDF, JPG, PNG o WEBP. Hasta 10 MB.</p>
        </div>

        {extractError && (
          <p role="alert" className="text-sm text-red-400">
            {extractError}
          </p>
        )}

        <button
          type="submit"
          disabled={!file || extracting}
          className="w-fit rounded border border-accent px-6 py-2 font-display text-sm hover:bg-accent hover:text-background disabled:opacity-50"
        >
          {extracting ? "Leyendo remito con IA..." : "Leer remito"}
        </button>
      </form>
    );
  }

  // Paso 2: revisar los ítems detectados y confirmar coincidencias.
  return (
    <div className="mt-6 flex max-w-3xl flex-col gap-6">
      {(supplierGuess || documentDate) && (
        <p className="text-sm text-foreground/60">
          Detectado en el documento
          {supplierGuess ? ` — proveedor: ${supplierGuess}` : ""}
          {documentDate ? ` — fecha: ${documentDate}` : ""}. Confirmá el proveedor abajo.
        </p>
      )}

      <div>
        <label htmlFor="supplier-review" className="block font-display text-sm">
          Proveedor
        </label>
        <select
          id="supplier-review"
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

      {lines.length === 0 && (
        <p className="text-foreground/70">
          No se detectó ningún ítem en el documento. Probá con otra foto o cargá la compra a
          mano desde{" "}
          <a href="/admin/compras/nueva" className="underline underline-offset-4">
            Nueva compra
          </a>
          .
        </p>
      )}

      <div className="flex flex-col gap-3">
        {lines.map((line) => {
          const conf = confidenceLabel(line.confidence);
          return (
            <div
              key={line.key}
              className={`rounded border border-border p-3 ${line.omitted ? "opacity-50" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{line.rawName}</p>
                  <p className={`text-xs ${conf.className}`}>
                    {line.variantLabel ? `→ ${line.variantLabel} · ${conf.text}` : conf.text}
                  </p>
                </div>
                <label className="flex items-center gap-1 text-xs text-foreground/60">
                  <input
                    type="checkbox"
                    checked={line.omitted}
                    onChange={(e) => updateLine(line.key, { omitted: e.target.checked })}
                  />
                  Omitir esta línea
                </label>
              </div>

              {!line.omitted && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="text-xs text-foreground/60">
                    Cant.
                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(line.key, { quantity: Number(e.target.value) })
                      }
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
                      onChange={(e) => updateLine(line.key, { unitCost: e.target.value })}
                      className="ml-2 w-24 rounded border border-border bg-background px-2 py-1"
                    />
                  </label>

                  {line.suggestions.length > 1 && (
                    <div className="flex flex-wrap gap-1">
                      {line.suggestions.map((s) => (
                        <button
                          key={s.variantId}
                          type="button"
                          onClick={() => pickSuggestion(line.key, s)}
                          className={`rounded border px-2 py-1 text-xs ${
                            line.variantId === s.variantId
                              ? "border-accent bg-accent text-background"
                              : "border-border hover:border-accent"
                          }`}
                        >
                          {s.label} ({Math.round(s.confidence * 100)}%)
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="relative w-full max-w-xs">
                    <input
                      value={line.searchQuery}
                      onChange={(e) => handleLineSearch(line.key, e.target.value)}
                      placeholder="Buscar otro producto por nombre o SKU..."
                      className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                    />
                    {line.searchResults.length > 0 && (
                      <ul className="absolute z-10 mt-1 w-full divide-y divide-border rounded border border-border bg-background shadow">
                        {line.searchResults.map((r) => (
                          <li key={r.id}>
                            <button
                              type="button"
                              onClick={() => pickSearchResult(line.key, r)}
                              className="flex w-full items-center justify-between px-2 py-1 text-left text-xs hover:bg-muted"
                            >
                              <span>{r.name}</span>
                              <span className="text-foreground/50">{r.sku}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {pendingMatches > 0 && (
        <p className="text-sm text-yellow-400">
          Todavía hay {pendingMatches} línea(s) sin producto asignado: elegí una coincidencia,
          buscá el producto correcto, o marcá la línea como &quot;Omitir&quot;.
        </p>
      )}

      <p className="font-display text-lg">Total: ${totalCost.toFixed(2)}</p>

      {submitError && (
        <p role="alert" className="text-sm text-red-400">
          {submitError}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={activeLines.length === 0 || pendingMatches > 0 || submitting}
          className="w-fit rounded border border-accent px-6 py-2 font-display text-sm hover:bg-accent hover:text-background disabled:opacity-50"
        >
          {submitting ? "Guardando..." : "Confirmar e ingresar stock"}
        </button>
        <button
          type="button"
          onClick={() => {
            setLines(null);
            setFile(null);
          }}
          className="w-fit rounded border border-border px-6 py-2 font-display text-sm hover:border-accent"
        >
          Volver a subir otro archivo
        </button>
      </div>
    </div>
  );
}
