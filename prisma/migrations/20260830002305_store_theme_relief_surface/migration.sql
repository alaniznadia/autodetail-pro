/*
  Warnings:

  - You are about to drop the column `catalogButtonColor` on the `StoreTheme` table. All the data in the column will be lost.
  - You are about to drop the column `catalogFont` on the `StoreTheme` table. All the data in the column will be lost.
  - You are about to drop the column `catalogFontSizePx` on the `StoreTheme` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "StoreTheme" DROP COLUMN "catalogButtonColor",
DROP COLUMN "catalogFont",
DROP COLUMN "catalogFontSizePx",
ADD COLUMN     "cardBorderWidthPx" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "cardRadiusPx" INTEGER NOT NULL DEFAULT 8,
ADD COLUMN     "cardShadow" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "surfaceColor" TEXT NOT NULL DEFAULT '#232532',
ALTER COLUMN "headingFont" SET DEFAULT 'inter',
ALTER COLUMN "backgroundColor" SET DEFAULT '#161826',
ALTER COLUMN "textColor" SET DEFAULT '#e9e9ed',
ALTER COLUMN "accentColor" SET DEFAULT '#9184d9';

-- Data migration: si nadie tocó nunca /admin/apariencia, la fila quedó con
-- los valores viejos (negro/blanco) en vez de nunca haber sido creada.
-- Los actualizamos al nuevo default (Nocturne) para no dejar la tienda
-- viendo el look anterior sin que nadie lo haya elegido a propósito.
UPDATE "StoreTheme"
SET "backgroundColor" = '#161826',
    "textColor" = '#e9e9ed',
    "accentColor" = '#9184d9',
    "headingFont" = 'inter'
WHERE "backgroundColor" = '#0a0a0a'
  AND "textColor" = '#f5f5f5'
  AND "accentColor" = '#ffffff'
  AND "headingFont" = 'oswald';
