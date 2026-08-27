import type { Metadata } from "next";
import { Oswald, Inter } from "next/font/google";
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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Epic Shine | Detailing Mode",
    template: "%s | Epic Shine",
  },
  description:
    "Productos de detailing automotor: shampoos, ceras, pulidos, microfibras y kits. Envíos a todo el país y retiro en el local.",
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
