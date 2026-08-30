import { describe, it, expect } from "vitest";
import { buildSearchText, findMatches, type MatchCandidate } from "@/lib/product-matching";

const candidates: MatchCandidate[] = [
  {
    variantId: "v1",
    label: "Cera Carnauba Premium - 500ml",
    sku: "CER-CARN-500",
    barcode: "7791234567890",
    searchText: buildSearchText(["Cera Carnauba Premium", "Epic Shine", "500ml"]),
  },
  {
    variantId: "v2",
    label: "Shampoo Neutro pH - 1L",
    sku: "SHA-NEU-1L",
    barcode: null,
    searchText: buildSearchText(["Shampoo Neutro pH", "Epic Shine", "1L"]),
  },
  {
    variantId: "v3",
    label: "Paño de Microfibra - Unidad",
    sku: "PAN-MICRO-U",
    barcode: null,
    searchText: buildSearchText(["Paño de Microfibra", null, "Unidad"]),
  },
];

describe("findMatches", () => {
  it("matchea por código de barras exacto sin importar el texto", () => {
    const result = findMatches("ITEM ILEGIBLE X", candidates, "7791234567890");
    expect(result).toEqual([
      { variantId: "v1", label: "Cera Carnauba Premium - 500ml", sku: "CER-CARN-500", confidence: 1 },
    ]);
  });

  it("matchea por SKU exacto ignorando mayúsculas", () => {
    const result = findMatches("algo distinto", candidates, "sha-neu-1l");
    expect(result[0].variantId).toBe("v2");
    expect(result[0].confidence).toBe(1);
  });

  it("encuentra la mejor coincidencia por nombre aunque tenga variaciones de tipeo", () => {
    const result = findMatches("CERA CARNAUBA 500 ML", candidates);
    expect(result[0].variantId).toBe("v1");
    expect(result[0].confidence).toBeGreaterThan(0.5);
  });

  it("no devuelve nada para un texto sin relación con el catálogo", () => {
    const result = findMatches("Flete a domicilio", candidates);
    expect(result.every((r) => r.variantId !== "v1" && r.variantId !== "v2")).toBe(true);
  });

  it("devuelve lista vacía si el texto está vacío", () => {
    expect(findMatches("", candidates)).toEqual([]);
  });
});
