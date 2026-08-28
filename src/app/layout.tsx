import type { Metadata } from "next";
import { Oswald, Inter } from "next/font/google";
import { SITE_URL } from "@/lib/site-url";
import { getStoreTheme } from "@/lib/store-theme";
import "./globals.css";

const condensed = Oswald({
  variable: "--font-condensed",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const description =
  "Productos de detailing automotor: shampoos, ceras, pulidos, microfibras y kits. Envíos a todo el país y retiro en el local.";

// El ícono se puede personalizar desde /admin/apariencia (StoreTheme.faviconUrl);
// por eso esto es generateMetadata (necesita leer la base) en vez del objeto
// estático que alcanzaba antes de esa feature.
export async function generateMetadata(): Promise<Metadata> {
  const theme = await getStoreTheme();

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: "Epic Shine | Detailing Mode",
      template: "%s | Epic Shine",
    },
    description,
    icons: theme.faviconUrl ? { icon: theme.faviconUrl } : undefined,
    openGraph: {
      siteName: "Epic Shine",
      type: "website",
      locale: "es_AR",
      title: "Epic Shine | Detailing Mode",
      description,
    },
    twitter: {
      card: "summary",
      title: "Epic Shine | Detailing Mode",
      description,
    },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${condensed.variable} ${body.variable} h-full antialiased`}
      // El script anti-flash de admin/POS agrega data-theme antes de la
      // hidratación (ver PANEL_THEME_INIT_SCRIPT); sin esto, React lo marca
      // como mismatch aunque el valor final sea el correcto a propósito.
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
