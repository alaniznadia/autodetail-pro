-- El color/tipografía/relieve de la tienda pública vuelven a ser fijos
-- (diseño Nocturne) en vez de personalizables desde /admin/apariencia.
ALTER TABLE "StoreTheme"
  DROP COLUMN "headingFont",
  DROP COLUMN "bodyFont",
  DROP COLUMN "baseFontSizePx",
  DROP COLUMN "backgroundColor",
  DROP COLUMN "textColor",
  DROP COLUMN "accentColor",
  DROP COLUMN "surfaceColor",
  DROP COLUMN "cardRadiusPx",
  DROP COLUMN "cardBorderWidthPx",
  DROP COLUMN "cardShadow";
