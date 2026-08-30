"use client";

/**
 * Barra apilada que anima su ancho al montarse (de 0 al valor real) para
 * mostrar de un vistazo cómo se reparte el catálogo entre disponible,
 * mínimo, agotado y sin control de stock.
 */

import { useEffect, useState } from "react";

type Breakdown = { disponible: number; minimo: number; agotado: number; sinControl: number };

const SEGMENTS: { key: keyof Breakdown; label: string; className: string }[] = [
  { key: "disponible", label: "Disponible", className: "bg-emerald-500" },
  { key: "minimo", label: "Mínimo", className: "bg-amber-500" },
  { key: "agotado", label: "Agotado", className: "bg-red-500" },
  { key: "sinControl", label: "Sin control", className: "bg-foreground/30" },
];

export function StockStatusBar({ breakdown }: { breakdown: Breakdown }) {
  const [animate, setAnimate] = useState(false);
  const total = breakdown.disponible + breakdown.minimo + breakdown.agotado + breakdown.sinControl;

  useEffect(() => {
    // Un tick después del primer paint: si el ancho final ya estuviera
    // puesto en el render inicial, no habría transición para animar.
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div>
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-foreground/10">
        {SEGMENTS.map((seg) => {
          const count = breakdown[seg.key];
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div
              key={seg.key}
              className={`h-full ${seg.className} transition-[width] duration-1000 ease-out`}
              style={{ width: `${animate ? pct : 0}%` }}
              title={`${seg.label}: ${count}`}
            />
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
        {SEGMENTS.map((seg) => (
          <span key={seg.key} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${seg.className}`} aria-hidden="true" />
            {seg.label} <span className="font-medium">{breakdown[seg.key]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
