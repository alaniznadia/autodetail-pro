import { prisma } from "@/lib/prisma";

export const STORE_THEME_ID = "default";

// Lista cerrada: el admin elige de acá, nunca escribe el nombre de la
// fuente a mano. Así el layout puede armar la URL de Google Fonts sin
// necesidad de validar/escapar nada.
export const HEADING_FONTS = [
  { value: "oswald", family: "Oswald", label: "Oswald (condensada, la actual)", google: "Oswald:wght@500;600;700" },
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

export type HeadingFontValue = (typeof HEADING_FONTS)[number]["value"];
export type BodyFontValue = (typeof BODY_FONTS)[number]["value"];

export const DEFAULT_STORE_THEME = {
  headingFont: "oswald" as HeadingFontValue,
  bodyFont: "inter" as BodyFontValue,
  baseFontSizePx: 16,
  backgroundColor: "#0a0a0a",
  textColor: "#f5f5f5",
  accentColor: "#ffffff",
  faviconUrl: null as string | null,
  logoUrl: null as string | null,
  aboutTitle: null as string | null,
  aboutContent: null as string | null,
  aboutImageUrl: null as string | null,
  catalogButtonColor: null as string | null,
  catalogFont: null as string | null,
  catalogFontSizePx: null as number | null,
};

export function findHeadingFont(value: string) {
  return HEADING_FONTS.find((f) => f.value === value) ?? HEADING_FONTS[0];
}

export function findBodyFont(value: string) {
  return BODY_FONTS.find((f) => f.value === value) ?? BODY_FONTS[0];
}

export async function getStoreTheme() {
  const theme = await prisma.storeTheme.findUnique({ where: { id: STORE_THEME_ID } });
  return theme ?? { id: STORE_THEME_ID, ...DEFAULT_STORE_THEME, updatedAt: new Date() };
}

type StoreThemeLike = Awaited<ReturnType<typeof getStoreTheme>>;

/**
 * Estilo de las tarjetas de producto (catálogo y "Destacados" de la home).
 * buttonColor siempre resuelve a algo (cae en accentColor); textStyle queda
 * undefined mientras el admin no haya tocado nada acá, para no pisar el
 * diseño de base (font-display, tamaños de Tailwind) hasta que lo
 * personalice a propósito.
 */
export function resolveCatalogCardStyle(theme: StoreThemeLike): {
  buttonColor: string;
  textStyle: { fontFamily?: string; fontSize?: string } | undefined;
} {
  const customized = theme.catalogFont !== null || theme.catalogFontSizePx !== null;
  return {
    buttonColor: theme.catalogButtonColor ?? theme.accentColor,
    textStyle: customized
      ? {
          fontFamily: theme.catalogFont
            ? `"${findBodyFont(theme.catalogFont).family}", sans-serif`
            : undefined,
          fontSize: theme.catalogFontSizePx ? `${theme.catalogFontSizePx}px` : undefined,
        }
      : undefined,
  };
}
