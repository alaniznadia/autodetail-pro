// Matching difuso de texto libre (línea de un remito/ticket) contra los
// productos existentes. No depende de ninguna librería: para el volumen de
// variantes de un catálogo de detailing, un coeficiente de Dice sobre
// bigramas de caracteres (similar en espíritu a pg_trgm) alcanza y es
// fácil de auditar.

export type MatchCandidate = {
  variantId: string;
  label: string; // "Producto - Variante", lo que ve el admin
  sku: string;
  barcode: string | null;
  searchText: string; // producto + marca + variante, ya normalizado
};

export type MatchSuggestion = {
  variantId: string;
  label: string;
  sku: string;
  confidence: number; // 0..1
};

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // saca acentos
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bigrams(text: string): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i < text.length - 1; i++) {
    set.add(text.slice(i, i + 2));
  }
  return set;
}

// Coeficiente de Dice: 2 * intersección / (tamaño A + tamaño B), en 0..1.
function diceCoefficient(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const bigramsA = bigrams(a);
  const bigramsB = bigrams(b);
  if (bigramsA.size === 0 || bigramsB.size === 0) return 0;

  let intersection = 0;
  for (const gram of bigramsA) {
    if (bigramsB.has(gram)) intersection++;
  }
  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

export function buildSearchText(parts: Array<string | null | undefined>): string {
  return normalize(parts.filter(Boolean).join(" "));
}

/**
 * Compara un texto libre (nombre de producto tal como aparece en el
 * remito) contra la lista de variantes activas y devuelve las mejores
 * coincidencias ordenadas por confianza. `exactCode` (SKU o código de
 * barras leído del documento, si el remito lo trae) siempre gana: si
 * coincide exacto con una variante, esa es la única sugerencia con
 * confianza 1.
 */
export function findMatches(
  rawName: string,
  candidates: MatchCandidate[],
  exactCode?: string | null,
  limit = 3
): MatchSuggestion[] {
  if (exactCode) {
    const code = exactCode.trim().toLowerCase();
    const exact = candidates.find(
      (c) => c.sku.toLowerCase() === code || c.barcode?.toLowerCase() === code
    );
    if (exact) {
      return [{ variantId: exact.variantId, label: exact.label, sku: exact.sku, confidence: 1 }];
    }
  }

  const query = normalize(rawName);
  if (!query) return [];

  const scored = candidates
    .map((c) => ({
      variantId: c.variantId,
      label: c.label,
      sku: c.sku,
      confidence: diceCoefficient(query, c.searchText),
    }))
    .filter((s) => s.confidence > 0.2)
    .sort((a, b) => b.confidence - a.confidence);

  return scored.slice(0, limit);
}

// Confianza a partir de la cual se preselecciona automáticamente la
// sugerencia (el admin siempre puede corregirla igual desde la revisión).
export const AUTO_MATCH_THRESHOLD = 0.55;
