"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  HEADING_FONTS,
  BODY_FONTS,
  CARD_SHADOWS,
  cardShadowValue,
  type HeadingFontValue,
  type BodyFontValue,
  type CardShadowValue,
} from "@/lib/store-theme";

type ThemeValues = {
  headingFont: HeadingFontValue;
  bodyFont: BodyFontValue;
  baseFontSizePx: number;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  surfaceColor: string;
  cardRadiusPx: number;
  cardBorderWidthPx: number;
  cardShadow: CardShadowValue;
};

export function AppearanceForm({ initial }: { initial: ThemeValues }) {
  const router = useRouter();
  const [values, setValues] = useState<ThemeValues>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ThemeValues>(key: K, value: ThemeValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/store-theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "No se pudo guardar.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <fieldset className="flex flex-col gap-4">
          <legend className="font-display text-sm">Colores</legend>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <ColorField label="Fondo" value={values.backgroundColor} onChange={(v) => set("backgroundColor", v)} />
            <ColorField label="Texto" value={values.textColor} onChange={(v) => set("textColor", v)} />
            <ColorField label="Acento" value={values.accentColor} onChange={(v) => set("accentColor", v)} />
            <ColorField
              label="Tarjetas/imágenes"
              value={values.surfaceColor}
              onChange={(v) => set("surfaceColor", v)}
            />
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="font-display text-sm">Tipografía</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="headingFont" className="block text-sm">
                Fuente de títulos
              </label>
              <select
                id="headingFont"
                value={values.headingFont}
                onChange={(e) => set("headingFont", e.target.value as HeadingFontValue)}
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
              <label htmlFor="bodyFont" className="block text-sm">
                Fuente de texto
              </label>
              <select
                id="bodyFont"
                value={values.bodyFont}
                onChange={(e) => set("bodyFont", e.target.value as BodyFontValue)}
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
              <label htmlFor="baseFontSizePx" className="block text-sm">
                Tamaño de letra ({values.baseFontSizePx}px)
              </label>
              <input
                id="baseFontSizePx"
                type="range"
                min={14}
                max={20}
                value={values.baseFontSizePx}
                onChange={(e) => set("baseFontSizePx", Number(e.target.value))}
                className="mt-3 w-full accent-accent"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="font-display text-sm">Relieve</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="cardRadiusPx" className="block text-sm">
                Esquinas ({values.cardRadiusPx}px)
              </label>
              <input
                id="cardRadiusPx"
                type="range"
                min={0}
                max={24}
                value={values.cardRadiusPx}
                onChange={(e) => set("cardRadiusPx", Number(e.target.value))}
                className="mt-3 w-full accent-accent"
              />
            </div>
            <div>
              <label htmlFor="cardBorderWidthPx" className="block text-sm">
                Grosor de borde ({values.cardBorderWidthPx}px)
              </label>
              <input
                id="cardBorderWidthPx"
                type="range"
                min={0}
                max={3}
                value={values.cardBorderWidthPx}
                onChange={(e) => set("cardBorderWidthPx", Number(e.target.value))}
                className="mt-3 w-full accent-accent"
              />
            </div>
            <div>
              <label htmlFor="cardShadow" className="block text-sm">
                Sombra
              </label>
              <select
                id="cardShadow"
                value={values.cardShadow}
                onChange={(e) => set("cardShadow", e.target.value as CardShadowValue)}
                className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
              >
                {CARD_SHADOWS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded border border-accent px-6 py-2.5 text-sm hover:bg-accent hover:text-background disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
          {saved && <span className="text-sm text-foreground/60">Guardado.</span>}
        </div>
      </form>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-2 text-xs uppercase tracking-[0.14em] text-foreground/45">Vista previa</p>
        <PreviewPanel values={values} />
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm">{label}</label>
      <div className="mt-1 flex items-center gap-2 rounded border border-border p-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-7 shrink-0 cursor-pointer border-0 bg-transparent p-0"
          aria-label={label}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 bg-transparent text-xs outline-none"
        />
      </div>
    </div>
  );
}

// Mockup autocontenido con estilos inline (no depende de las variables CSS
// reales de la tienda): así se ve al instante el efecto de cada cambio,
// incluso antes de guardar.
function PreviewPanel({ values }: { values: ThemeValues }) {
  const heading = HEADING_FONTS.find((f) => f.value === values.headingFont) ?? HEADING_FONTS[0];
  const body = BODY_FONTS.find((f) => f.value === values.bodyFont) ?? BODY_FONTS[0];
  const frame: React.CSSProperties = {
    borderRadius: `${values.cardRadiusPx}px`,
    borderWidth: `${values.cardBorderWidthPx}px`,
    borderStyle: "solid",
    boxShadow: cardShadowValue(values.cardShadow),
  };

  return (
    <div
      className="overflow-hidden rounded border border-border"
      style={{
        background: values.backgroundColor,
        color: values.textColor,
        fontFamily: `"${body.family}", sans-serif`,
        fontSize: `${values.baseFontSizePx}px`,
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: `1px solid ${values.textColor}22` }}
      >
        <span style={{ fontFamily: `"${heading.family}", sans-serif`, fontWeight: 500 }}>Epic Shine</span>
        <span
          style={{ ...frame, borderColor: values.accentColor, color: values.accentColor, padding: "4px 10px", fontSize: "0.8em" }}
        >
          Carrito · 2
        </span>
      </div>

      <div className="p-4">
        <div
          className="mx-auto mb-3 aspect-square w-2/3 overflow-hidden"
          style={{ ...frame, borderColor: values.textColor + "33", background: values.surfaceColor }}
        />
        <p style={{ fontFamily: `"${heading.family}", sans-serif`, fontWeight: 500, fontSize: "1.05em" }}>
          Cera en Pasta Carnauba
        </p>
        <div className="mt-2 flex items-center justify-between">
          <span>$15.900</span>
          <span
            style={{
              ...frame,
              borderColor: values.accentColor,
              color: values.accentColor,
              padding: "5px 12px",
              fontSize: "0.85em",
            }}
          >
            Agregar
          </span>
        </div>
      </div>
    </div>
  );
}
