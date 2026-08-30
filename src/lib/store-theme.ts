import { prisma } from "@/lib/prisma";

export const STORE_THEME_ID = "default";

// El color/tipografía/relieve de la tienda pública son fijos (diseño
// Nocturne, ver (store)/layout.tsx); estos campos son lo único que sigue
// siendo personalizable desde /admin/apariencia.
export const DEFAULT_STORE_THEME = {
  faviconUrl: null as string | null,
  logoUrl: null as string | null,
  aboutTitle: null as string | null,
  aboutContent: null as string | null,
  aboutImageUrl: null as string | null,
};

export async function getStoreTheme() {
  const theme = await prisma.storeTheme.findUnique({ where: { id: STORE_THEME_ID } });
  return theme ?? { id: STORE_THEME_ID, ...DEFAULT_STORE_THEME, updatedAt: new Date() };
}
