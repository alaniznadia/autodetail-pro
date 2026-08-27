import { SiteHeader } from "@/components/store/site-header";
import { SiteFooter } from "@/components/store/site-footer";
import { CartProvider } from "@/components/store/cart-context";
import { getStoreTheme, findHeadingFont, findBodyFont } from "@/lib/store-theme";

export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const theme = await getStoreTheme();
  const headingFont = findHeadingFont(theme.headingFont);
  const bodyFont = findBodyFont(theme.bodyFont);
  const fontsHref = `https://fonts.googleapis.com/css2?family=${headingFont.google}&family=${bodyFont.google}&display=swap`;

  // Estas variables son las mismas que usa todo el resto de la tienda
  // (Tailwind bg-background/text-foreground y la clase .font-display, ver
  // globals.css); al redefinirlas acá, solo se pisan para este subárbol —
  // el panel de admin y el POS no se ven afectados.
  const themeStyle = {
    "--background": theme.backgroundColor,
    "--foreground": theme.textColor,
    "--accent": theme.accentColor,
    "--font-condensed": `"${headingFont.family}"`,
    "--font-body": `"${bodyFont.family}"`,
    fontSize: `${theme.baseFontSizePx}px`,
  } as React.CSSProperties;

  return (
    <CartProvider>
      <link rel="stylesheet" href={fontsHref} />
      <div style={themeStyle} className="flex min-h-screen flex-1 flex-col bg-background text-foreground">
        <SiteHeader />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </div>
    </CartProvider>
  );
}
