import { SiteHeader } from "@/components/store/site-header";
import { SiteFooter } from "@/components/store/site-footer";
import { CartProvider } from "@/components/store/cart-context";
import { getStoreTheme } from "@/lib/store-theme";
import { deriveLightPalette } from "@/lib/color";
import { STORE_THEME_INIT_SCRIPT } from "@/lib/store-panel-theme";
import { MobileStoreBar } from "@/components/store/mobile-store-ui";

export const dynamic = "force-dynamic";

// Paleta "Nocturne" fija: el color/tipografía/relieve de la tienda pública
// no se personalizan desde /admin/apariencia (ver README del diseño) — solo
// el logo, el favicon, los banners y "sobre nosotros" siguen siendo
// editables ahí. El modo claro no es una segunda paleta a mano: se deriva
// de estos mismos tres colores (ver deriveLightPalette) y se activa con
// data-theme="light" en #store-root (toggle en el header).
const NOCTURNE = {
  background: "#161826",
  foreground: "#e9e9ed",
  accent: "#9184d9",
  surface: "#232532",
  border: "#3f424d",
  muted: "#292b31",
};

const LIGHT = deriveLightPalette({
  background: NOCTURNE.background,
  text: NOCTURNE.foreground,
  accent: NOCTURNE.accent,
});

// Un atributo (data-theme) no puede pisar una propiedad puesta con
// style="" — por eso los colores van en un <style> propio en vez del style
// inline del div, con una regla aparte para el override de modo claro.
const THEME_CSS = `
  #store-root {
    --background: ${NOCTURNE.background};
    --foreground: ${NOCTURNE.foreground};
    --accent: ${NOCTURNE.accent};
    --surface: ${NOCTURNE.surface};
    --border: ${NOCTURNE.border};
    --muted: ${NOCTURNE.muted};
  }
  #store-root[data-theme="light"] {
    --background: ${LIGHT.background};
    --foreground: ${LIGHT.foreground};
    --accent: ${LIGHT.accent};
    --surface: ${LIGHT.surface};
    --border: ${LIGHT.border};
    --muted: ${LIGHT.muted};
  }
`;

const THEME_STYLE = {
  "--font-condensed": '"Inter"',
  "--font-body": '"Inter"',
  "--store-radius": "8px",
  "--store-border-width": "1px",
  "--store-shadow": "none",
  fontSize: "16px",
} as React.CSSProperties;

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  // El logo/favicon siguen siendo personalizables desde /admin/apariencia;
  // el color/tipografía/relieve quedaron fijos (ver arriba).
  const theme = await getStoreTheme();

  return (
    <CartProvider>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" />
      <style dangerouslySetInnerHTML={{ __html: THEME_CSS }} />
      <div
        id="store-root"
        style={THEME_STYLE}
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
