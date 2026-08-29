import { SiteHeader } from "@/components/store/site-header";
import { SiteFooter } from "@/components/store/site-footer";
import { CartProvider } from "@/components/store/cart-context";
import { getStoreTheme } from "@/lib/store-theme";
import { MobileStoreBar } from "@/components/store/mobile-store-ui";

export const dynamic = "force-dynamic";

// Paleta "Nocturne": la tienda pública ya no usa el color/tipografía
// personalizable de /admin/apariencia (se reemplazó por un tema fijo, a
// pedido). Estos valores son los mismos tokens que ya usa el POS bajo la
// clase .noc (ver nocturne.css) — acá se aplican como el tema por defecto
// de TODO el subárbol de la tienda en vez de quedar detrás de una clase
// de scope, así los componentes existentes (que ya usan bg-background,
// text-foreground, border-border, etc.) los heredan sin tocarlos.
const NOCTURNE_STORE_THEME = {
  "--background": "#161826",
  "--foreground": "#e9e9ed",
  "--accent": "#9184d9",
  "--muted": "#292b31",
  "--border": "#3f424d",
  "--surface": "#232532",
  "--font-condensed": '"Inter"',
  "--font-body": '"Inter"',
  fontSize: "16px",
} as React.CSSProperties;

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  // El logo/favicon siguen siendo personalizables desde /admin/apariencia;
  // solo el color/tipografía quedó fijo.
  const theme = await getStoreTheme();

  return (
    <CartProvider>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" />
      <div style={NOCTURNE_STORE_THEME} className="flex min-h-screen flex-1 flex-col bg-background text-foreground">
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
