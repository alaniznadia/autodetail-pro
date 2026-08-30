import { SiteHeader } from "@/components/store/site-header";
import { SiteFooter } from "@/components/store/site-footer";
import { CartProvider } from "@/components/store/cart-context";
import { getStoreTheme, findHeadingFont, findBodyFont, cardShadowValue } from "@/lib/store-theme";
import { mixHex, deriveLightPalette } from "@/lib/color";
import { STORE_THEME_INIT_SCRIPT } from "@/lib/store-panel-theme";
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
  //
  // El modo claro no se configura aparte: se deriva de estos mismos tres
  // colores (ver deriveLightPalette) y se activa con data-theme="light" en
  // #store-root (toggle en el header, ver store-theme-toggle.tsx). Por eso
  // los colores van en un <style> propio en vez de en el style inline del
  // div: un atributo no puede pisar una propiedad puesta con style="" —
  // necesita una regla de CSS aparte para el override.
  const light = deriveLightPalette({
    background: theme.backgroundColor,
    text: theme.textColor,
    accent: theme.accentColor,
  });

  // Todos los valores salen de columnas validadas como color hexadecimal
  // (zod, ver /api/admin/store-theme) o se derivan de esos mismos hex acá
  // mismo — nunca de texto libre — así que es seguro interpolarlos en CSS.
  const themeCss = `
    #store-root {
      --background: ${theme.backgroundColor};
      --foreground: ${theme.textColor};
      --accent: ${theme.accentColor};
      --surface: ${theme.surfaceColor};
      --border: ${mixHex(theme.textColor, theme.backgroundColor, 0.18)};
      --muted: ${mixHex(theme.textColor, theme.backgroundColor, 0.08)};
    }
    #store-root[data-theme="light"] {
      --background: ${light.background};
      --foreground: ${light.foreground};
      --accent: ${light.accent};
      --surface: ${light.surface};
      --border: ${light.border};
      --muted: ${light.muted};
    }
  `;

  const themeStyle = {
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
      <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      <div
        id="store-root"
        style={themeStyle}
        className="flex min-h-screen flex-1 flex-col bg-background text-foreground transition-colors"
        // El script anti-flash de abajo agrega data-theme="light" antes de
        // la hidratación (si la visita ya lo había elegido); sin esto React
        // lo marca como mismatch aunque el valor final sea el correcto a
        // propósito (mismo patrón que <html suppressHydrationWarning> en
        // app/layout.tsx para el tema del admin/POS).
        suppressHydrationWarning
      >
        <SiteHeader logoUrl={theme.logoUrl} />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <MobileStoreBar />
      </div>
      <script dangerouslySetInnerHTML={{ __html: STORE_THEME_INIT_SCRIPT }} />
    </CartProvider>
  );
}
