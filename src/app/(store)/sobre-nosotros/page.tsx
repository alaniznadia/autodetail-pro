import type { Metadata } from "next";
import Image from "next/image";
import { getStoreTheme } from "@/lib/store-theme";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sobre nosotros",
  alternates: { canonical: "/sobre-nosotros" },
};

export default async function AboutPage() {
  const theme = await getStoreTheme();
  const title = theme.aboutTitle || "Sobre nosotros";

  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="font-display text-3xl font-bold">{title}</h1>

      {theme.aboutImageUrl && (
        <div className="relative mt-8 h-96 w-full rounded bg-white">
          <Image
            src={theme.aboutImageUrl}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-contain"
          />
        </div>
      )}

      {theme.aboutContent ? (
        <div className="mt-8 whitespace-pre-line text-foreground/80">{theme.aboutContent}</div>
      ) : (
        <p className="mt-8 text-foreground/60">
          Todavía no cargamos esta sección. Volvé pronto.
        </p>
      )}
    </div>
  );
}
