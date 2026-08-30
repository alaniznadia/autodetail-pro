import { getStoreTheme, type HeadingFontValue, type BodyFontValue, type CardShadowValue } from "@/lib/store-theme";
import { prisma } from "@/lib/prisma";
import { SiteImageUpload } from "@/components/admin/site-image-upload";
import { StoreBannersManager } from "@/components/admin/store-banners-manager";
import { AboutForm } from "@/components/admin/about-form";
import { AppearanceForm } from "@/components/admin/appearance-form";

export const dynamic = "force-dynamic";

export default async function AdminAppearancePage() {
  const [theme, banners] = await Promise.all([
    getStoreTheme(),
    prisma.storeBanner.findMany({ orderBy: { position: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-12">
      <div>
        <h1 className="font-display text-2xl font-bold">Apariencia de la tienda</h1>
        <p className="mt-2 max-w-xl text-sm text-foreground/70">
          Estos cambios se aplican a la tienda pública (no al panel de administración
          ni al punto de venta). Por defecto la tienda usa el diseño oscuro Nocturne,
          pero podés personalizar cualquier color, tipografía o relieve — la vista
          previa de la derecha se actualiza al toque, antes de guardar.
        </p>
      </div>

      <section>
        <h2 className="font-display text-lg">Colores, tipografía y relieve</h2>
        <div className="mt-4">
          <AppearanceForm
            initial={{
              headingFont: theme.headingFont as HeadingFontValue,
              bodyFont: theme.bodyFont as BodyFontValue,
              baseFontSizePx: theme.baseFontSizePx,
              backgroundColor: theme.backgroundColor,
              textColor: theme.textColor,
              accentColor: theme.accentColor,
              surfaceColor: theme.surfaceColor,
              cardRadiusPx: theme.cardRadiusPx,
              cardBorderWidthPx: theme.cardBorderWidthPx,
              cardShadow: theme.cardShadow as CardShadowValue,
            }}
          />
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg">Ícono y logo</h2>
        <p className="mt-1 max-w-xl text-sm text-foreground/70">
          El ícono se ve en la pestaña del navegador; el logo reemplaza el texto
          &quot;Epic Shine&quot; del encabezado de la tienda.
        </p>
        <div className="mt-4 flex flex-wrap gap-4">
          <SiteImageUpload
            kind="favicon"
            label="Ícono del sitio (favicon)"
            hint="Se recomienda una imagen cuadrada."
            currentUrl={theme.faviconUrl}
          />
          <SiteImageUpload
            kind="logo"
            label="Logo del encabezado"
            currentUrl={theme.logoUrl}
          />
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg">Banners de la home</h2>
        <p className="mt-1 max-w-xl text-sm text-foreground/70">
          Se muestran en una franja al principio de la tienda. Cada uno puede llevar a
          una sección puntual (opcional).
        </p>
        <div className="mt-4">
          <StoreBannersManager banners={banners} />
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg">Sobre nosotros</h2>
        <p className="mt-1 max-w-xl text-sm text-foreground/70">
          Contenido de la página pública /sobre-nosotros.
        </p>
        <div className="mt-4 flex flex-wrap gap-6">
          <AboutForm
            initial={{
              aboutTitle: theme.aboutTitle ?? "",
              aboutContent: theme.aboutContent ?? "",
            }}
          />
          <SiteImageUpload kind="about" label="Imagen" currentUrl={theme.aboutImageUrl} />
        </div>
      </section>
    </div>
  );
}
