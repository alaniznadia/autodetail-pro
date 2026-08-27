-- CreateTable
CREATE TABLE "StoreTheme" (
    "id" TEXT NOT NULL,
    "headingFont" TEXT NOT NULL DEFAULT 'oswald',
    "bodyFont" TEXT NOT NULL DEFAULT 'inter',
    "baseFontSizePx" INTEGER NOT NULL DEFAULT 16,
    "backgroundColor" TEXT NOT NULL DEFAULT '#0a0a0a',
    "textColor" TEXT NOT NULL DEFAULT '#f5f5f5',
    "accentColor" TEXT NOT NULL DEFAULT '#ffffff',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreTheme_pkey" PRIMARY KEY ("id")
);
