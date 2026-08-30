function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(n: number) {
  return Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");
}

/** Mezcla `weight` (0-1) de `hexA` sobre `hexB`. */
export function mixHex(hexA: string, hexB: string, weight: number) {
  const [ar, ag, ab] = hexToRgb(hexA);
  const [br, bg, bb] = hexToRgb(hexB);
  const r = ar * weight + br * (1 - weight);
  const g = ag * weight + bg * (1 - weight);
  const b = ab * weight + bb * (1 - weight);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Deriva un modo claro a partir de los tres colores oscuros configurados,
 * sin que el admin tenga que elegir una segunda paleta a mano: el fondo y
 * el texto se invierten (manteniendo un toque del matiz original) y el
 * acento se mantiene igual, ya suele funcionar en ambos fondos.
 */
export function deriveLightPalette({
  background,
  text,
  accent,
}: {
  background: string;
  text: string;
  accent: string;
}) {
  const lightBackground = mixHex(text, "#ffffff", 0.08);
  const lightForeground = mixHex(background, "#000000", 0.82);
  return {
    background: lightBackground,
    foreground: lightForeground,
    accent,
    surface: mixHex(lightForeground, lightBackground, 0.05),
    border: mixHex(lightForeground, lightBackground, 0.16),
    muted: mixHex(lightForeground, lightBackground, 0.06),
  };
}
