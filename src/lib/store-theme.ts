import { prisma } from "@/lib/prisma";

export const STORE_THEME_ID = "default";

// Lista cerrada: el admin elige de acá, nunca escribe el nombre de la
// fuente a mano. Así el layout puede armar la URL de Google Fonts sin
// necesidad de validar/escapar nada.
export const HEADING_FONTS = [
  { value: "inter", family: "Inter", label: "Inter (la actual, Nocturne)", google: "Inter:wght@400;500;600" },
  { value: "oswald", family: "Oswald", label: "Oswald (condensada)", google: "Oswald:wght@500;600;700" },
  { value: "bebas-neue", family: "Bebas Neue", label: "Bebas Neue", google: "Bebas+Neue" },
  { value: "anton", family: "Anton", label: "Anton", google: "Anton" },
  { value: "archivo-black", family: "Archivo Black", label: "Archivo Black", google: "Archivo+Black" },
  {
    value: "barlow-condensed",
    family: "Barlow Condensed",
    label: "Barlow Condensed",
    google: "Barlow+Condensed:wght@500;600;700",
  },
] as const;

export const BODY_FONTS = [
  { value: "inter", family: "Inter", label: "Inter (la actual)", google: "Inter:wght@400;500;600" },
  { value: "roboto", family: "Roboto", label: "Roboto", google: "Roboto:wght@400;500;600" },
  { value: "open-sans", family: "Open Sans", label: "Open Sans", google: "Open+Sans:wght@400;500;600" },
  { value: "lato", family: "Lato", label: "Lato", google: "Lato:wght@400;700" },
  { value: "poppins", family: "Poppins", label: "Poppins", google: "Poppins:wght@400;500;600" },
] as const;

export const CARD_SHADOWS = [
  { value: "none", label: "Plano (sin sombra)" },
  { value: "soft", label: "Sombra suave" },
  { value: "strong", label: "Sombra marcada" },
] as const;

export type HeadingFontValue = (typeof HEADING_FONTS)[number]["value"];
export type BodyFontValue = (typeof BODY_FONTS)[number]["value"];
export type CardShadowValue = (typeof CARD_SHADOWS)[number]["value"];

// Los valores por default son los del diseño oscuro "Nocturne" (el mismo
// que usa el POS); la tienda se ve así hasta que se personalice acá.
export const DEFAULT_STORE_THEME = {
  headingFont: "inter" as HeadingFontValue,
  bodyFont: "inter" as BodyFontValue,
  baseFontSizePx: 16,
  backgroundColor: "#161826",
  textColor: "#e9e9ed",
  accentColor: "#9184d9",
  surfaceColor: "#232532",
  cardRadiusPx: 8,
  cardBorderWidthPx: 1,
  cardShadow: "none" as CardShadowValue,
  faviconUrl: null as string | null,
  logoUrl: null as string | null,
  aboutTitle: null as string | null,
  aboutContent: null as string | null,
  aboutImageUrl: null as string | null,
};

export function findHeadingFont(value: string) {
  return HEADING_FONTS.find((f) => f.value === value) ?? HEADING_FONTS[0];
}

export function findBodyFont(value: string) {
  return BODY_FONTS.find((f) => f.value === value) ?? BODY_FONTS[0];
}

export function cardShadowValue(shadow: string): string {
  if (shadow === "soft") return "0 1px 3px rgba(0,0,0,0.3)";
  if (shadow === "strong") return "0 6px 20px rgba(0,0,0,0.5)";
  return "none";
}

export async function getStoreTheme() {
  const theme = await prisma.storeTheme.findUnique({ where: { id: STORE_THEME_ID } });
  return theme ?? { id: STORE_THEME_ID, ...DEFAULT_STORE_THEME, updatedAt: new Date() };
}
