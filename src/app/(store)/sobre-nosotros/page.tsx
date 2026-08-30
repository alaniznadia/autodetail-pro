import type { Metadata } from "next";
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
      <h1 className="font-display text-[34px] font-bold">{title}</h1>

      {theme.aboutImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={theme.aboutImageUrl}
          alt={title}
          className="mt-8 max-h-96 w-full rounded bg-white object-contain"
        />
      )}

      {theme.aboutContent ? (
        <div className="mt-8 whitespace-pre-line text-foreground/90">{theme.aboutContent}</div>
      ) : (
        <p className="mt-8 text-foreground/78">
          Todavía no cargamos esta sección. Volvé pronto.
        </p>
      )}
    </div>
  );
}
