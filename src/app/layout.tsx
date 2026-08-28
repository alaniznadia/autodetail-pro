import type { Metadata } from "next";
import { Oswald, Inter } from "next/font/google";
import { SITE_URL } from "@/lib/site-url";
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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Epic Shine | Detailing Mode",
    template: "%s | Epic Shine",
  },
  description,
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${condensed.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
