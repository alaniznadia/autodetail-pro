"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BODY_FONTS } from "@/lib/store-theme";

type CatalogStyle = {
  catalogButtonColor: string | null;
  catalogFont: string | null;
  catalogFontSizePx: number | null;
};

const DEFAULT_COLOR = "#ffffff";
const DEFAULT_FONT = "inter";
const DEFAULT_SIZE = 16;

export function CatalogStyleForm({ initial }: { initial: CatalogStyle }) {
  const router = useRouter();
  const [color, setColor] = useState(initial.catalogButtonColor ?? DEFAULT_COLOR);
  const [font, setFont] = useState(initial.catalogFont ?? DEFAULT_FONT);
  const [size, setSize] = useState(initial.catalogFontSizePx ?? DEFAULT_SIZE);
  // Mientras sea null, las tarjetas usan los valores generales del tema
  // (ver resolveCatalogCardStyle); tocar cualquier control lo activa.
  const [customized, setCustomized] = useState(
    initial.catalogButtonColor !== null ||
      initial.catalogFont !== null ||
      initial.catalogFontSizePx !== null
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function save(payload: {
    catalogButtonColor: string | null;
    catalogFont: string | null;
    catalogFontSizePx: number | null;
  }) {
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/admin/store-theme/catalog", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCustomized(true);
    save({ catalogButtonColor: color, catalogFont: font, catalogFontSizePx: size });
  }

  function handleReset() {
    setColor(DEFAULT_COLOR);
    setFont(DEFAULT_FONT);
    setSize(DEFAULT_SIZE);
    setCustomized(false);
    save({ catalogButtonColor: null, catalogFont: null, catalogFontSizePx: null });
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div>
        <label htmlFor="catalog-color" className="block text-sm">
          Color del botón &quot;Comprar&quot;
        </label>
        <input
          id="catalog-color"
          type="color"
          value={color}
          onChange={(e) => {
            setColor(e.target.value);
            setSaved(false);
          }}
          className="mt-1 h-10 w-24 rounded border border-border bg-background"
        />
      </div>

      <div>
        <label htmlFor="catalog-font" className="block text-sm">
          Tipografía del nombre y precio
        </label>
        <select
          id="catalog-font"
          value={font}
          onChange={(e) => {
            setFont(e.target.value);
            setSaved(false);
          }}
          className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
        >
          {BODY_FONTS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="catalog-size" className="block text-sm">
          Tamaño de letra: {size}px
        </label>
        <input
          id="catalog-size"
          type="range"
          min={10}
          max={28}
          value={size}
          onChange={(e) => {
            setSize(Number(e.target.value));
            setSaved(false);
          }}
          className="mt-1 w-full"
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

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="w-fit rounded border border-accent px-6 py-2 font-display text-sm hover:bg-accent hover:text-background disabled:opacity-50"
        >
          {submitting ? "Guardando..." : "Guardar cambios"}
        </button>
        {customized && (
          <button
            type="button"
            onClick={handleReset}
            disabled={submitting}
            className="w-fit rounded border border-border px-6 py-2 font-display text-sm hover:border-accent disabled:opacity-50"
          >
            Restaurar
          </button>
        )}
      </div>
    </form>
  );
}
