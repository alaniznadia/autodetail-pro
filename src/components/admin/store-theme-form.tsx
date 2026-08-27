"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HEADING_FONTS, BODY_FONTS } from "@/lib/store-theme";

type Theme = {
  headingFont: string;
  bodyFont: string;
  baseFontSizePx: number;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
};

export function StoreThemeForm({ initial }: { initial: Theme }) {
  const router = useRouter();
  const [theme, setTheme] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof Theme>(key: K, value: Theme[K]) {
    setTheme((t) => ({ ...t, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/admin/store-theme", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(theme),
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

  const headingFont = HEADING_FONTS.find((f) => f.value === theme.headingFont) ?? HEADING_FONTS[0];
  const bodyFont = BODY_FONTS.find((f) => f.value === theme.bodyFont) ?? BODY_FONTS[0];
  const previewFontsHref = `https://fonts.googleapis.com/css2?family=${headingFont.google}&family=${bodyFont.google}&display=swap`;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-5">
        <div>
          <label htmlFor="headingFont" className="block font-display text-sm">
            Tipografía de títulos
          </label>
          <select
            id="headingFont"
            value={theme.headingFont}
            onChange={(e) => update("headingFont", e.target.value)}
            className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
          >
            {HEADING_FONTS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="bodyFont" className="block font-display text-sm">
            Tipografía de texto
          </label>
          <select
            id="bodyFont"
            value={theme.bodyFont}
            onChange={(e) => update("bodyFont", e.target.value)}
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
          <label htmlFor="baseFontSizePx" className="block font-display text-sm">
            Tamaño de letra base: {theme.baseFontSizePx}px
          </label>
          <input
            id="baseFontSizePx"
            type="range"
            min={14}
            max={20}
            value={theme.baseFontSizePx}
            onChange={(e) => update("baseFontSizePx", Number(e.target.value))}
            className="mt-1 w-full"
          />
          <div className="flex justify-between text-xs text-foreground/50">
            <span>Chico (14px)</span>
            <span>Grande (20px)</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="backgroundColor" className="block text-sm">
              Color de fondo
            </label>
            <input
              id="backgroundColor"
              type="color"
              value={theme.backgroundColor}
              onChange={(e) => update("backgroundColor", e.target.value)}
              className="mt-1 h-10 w-full rounded border border-border bg-background"
            />
          </div>
          <div>
            <label htmlFor="textColor" className="block text-sm">
              Color de texto
            </label>
            <input
              id="textColor"
              type="color"
              value={theme.textColor}
              onChange={(e) => update("textColor", e.target.value)}
              className="mt-1 h-10 w-full rounded border border-border bg-background"
            />
          </div>
          <div>
            <label htmlFor="accentColor" className="block text-sm">
              Color de acento
            </label>
            <input
              id="accentColor"
              type="color"
              value={theme.accentColor}
              onChange={(e) => update("accentColor", e.target.value)}
              className="mt-1 h-10 w-full rounded border border-border bg-background"
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}
        {saved && (
          <p role="status" className="text-sm text-green-500">
            Cambios guardados. Así se ve la tienda ahora.
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

      <div>
        <p className="mb-2 font-display text-sm text-foreground/60">Vista previa</p>
        <link rel="stylesheet" href={previewFontsHref} />
        <div
          className="rounded border border-border p-6"
          style={{
            background: theme.backgroundColor,
            color: theme.textColor,
            fontSize: `${theme.baseFontSizePx}px`,
          }}
        >
          <p
            style={{
              fontFamily: `"${headingFont.family}", sans-serif`,
              textTransform: "uppercase",
              letterSpacing: "0.02em",
              fontWeight: 700,
              fontSize: "1.8em",
            }}
          >
            Epic Shine
          </p>
          <p
            style={{
              fontFamily: `"${bodyFont.family}", sans-serif`,
              marginTop: "0.5em",
              opacity: 0.8,
            }}
          >
            Productos profesionales para el cuidado y la estética de tu auto.
          </p>
          <button
            type="button"
            style={{
              marginTop: "1em",
              padding: "0.5em 1.2em",
              border: `1px solid ${theme.accentColor}`,
              color: theme.accentColor,
              background: "transparent",
              fontFamily: `"${HEADING_FONTS.find((f) => f.value === theme.headingFont)?.label.split(" (")[0]}", sans-serif`,
              textTransform: "uppercase",
              fontSize: "0.85em",
              letterSpacing: "0.05em",
            }}
          >
            Ver catálogo
          </button>
        </div>
      </div>
    </div>
  );
}
