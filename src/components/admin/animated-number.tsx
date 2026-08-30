"use client";

import { useEffect, useState } from "react";

// No se puede pasar una función de formato desde un server component (no es
// serializable a través del límite RSC); "kind" viaja como string en cambio.
type Kind = "number" | "money";

function format(n: number, kind: Kind) {
  const rounded = Math.round(n).toLocaleString("es-AR");
  return kind === "money" ? `$${rounded}` : rounded;
}

/** Cuenta de 0 hasta `value` al montarse, sin animar en cada re-render. */
export function AnimatedNumber({
  value,
  kind = "number",
  durationMs = 900,
}: {
  value: number;
  kind?: Kind;
  durationMs?: number;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) return;

    let frame: number;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      // ease-out: arranca rápido y frena al final, se siente más "vivo".
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // Corre solo al montar (no en cada cambio de value/durationMs); si React
    // vuelve a montar (p. ej. doble efecto de Strict Mode en desarrollo), es
    // seguro que se reinicie: no hay estado externo que se duplique.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{format(display, kind)}</>;
}
