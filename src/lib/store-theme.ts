import { prisma } from "@/lib/prisma";

export const STORE_THEME_ID = "default";

// El color/tipografía de la tienda pública quedaron fijos (diseño
// Nocturne, ver (store)/layout.tsx); estos campos solo se conservan por lo
// que todavía es personalizable desde /admin/apariencia (logo, favicon,
// "sobre nosotros").
export const DEFAULT_STORE_THEME = {
  headingFont: "oswald",
  bodyFont: "inter",
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

export async function getStoreTheme() {
  const theme = await prisma.storeTheme.findUnique({ where: { id: STORE_THEME_ID } });
  return theme ?? { id: STORE_THEME_ID, ...DEFAULT_STORE_THEME, updatedAt: new Date() };
}
