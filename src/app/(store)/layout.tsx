import { SiteHeader } from "@/components/store/site-header";
import { SiteFooter } from "@/components/store/site-footer";
import { CartProvider } from "@/components/store/cart-context";
import { getStoreTheme, findHeadingFont, findBodyFont, cardShadowValue } from "@/lib/store-theme";
import { mixHex } from "@/lib/color";
import { MobileStoreBar } from "@/components/store/mobile-store-ui";

export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const theme = await getStoreTheme();
  const headingFont = findHeadingFont(theme.headingFont);
  const bodyFont = findBodyFont(theme.bodyFont);
  const fontsHref = `https://fonts.googleapis.com/css2?family=${headingFont.google}&family=${bodyFont.google}&display=swap`;

  // El diseño Nocturne queda como default (ver DEFAULT_STORE_THEME); estas
  // variables son las mismas que usa todo el resto de la tienda (Tailwind
  // bg-background/text-foreground/border-border/bg-surface, ver
  // globals.css), así que personalizar desde /admin/apariencia alcanza y
  // sobra sin tocar los componentes.
  const themeStyle = {
    "--background": theme.backgroundColor,
    "--foreground": theme.textColor,
    "--accent": theme.accentColor,
    "--surface": theme.surfaceColor,
    // Borde y "muted" no son personalizables directo: se derivan del
    // texto sobre el fondo, para que siempre se vean bien sin importar
    // qué combinación de colores se elija.
    "--border": mixHex(theme.textColor, theme.backgroundColor, 0.18),
    "--muted": mixHex(theme.textColor, theme.backgroundColor, 0.08),
    "--font-condensed": `"${headingFont.family}"`,
    "--font-body": `"${bodyFont.family}"`,
    "--store-radius": `${theme.cardRadiusPx}px`,
    "--store-border-width": `${theme.cardBorderWidthPx}px`,
    "--store-shadow": cardShadowValue(theme.cardShadow),
    fontSize: `${theme.baseFontSizePx}px`,
  } as React.CSSProperties;

  return (
    <CartProvider>
      <link rel="stylesheet" href={fontsHref} />
      <div style={themeStyle} className="flex min-h-screen flex-1 flex-col bg-background text-foreground">
        <SiteHeader logoUrl={theme.logoUrl} />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <MobileStoreBar />
      </div>
    </CartProvider>
  );
}
