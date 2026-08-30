import { getStoreTheme } from "@/lib/store-theme";
import { prisma } from "@/lib/prisma";
import { SiteImageUpload } from "@/components/admin/site-image-upload";
import { StoreBannersManager } from "@/components/admin/store-banners-manager";
import { AboutForm } from "@/components/admin/about-form";
import { ContactForm } from "@/components/admin/contact-form";

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
          ni al punto de venta). El color y la tipografía de la tienda son fijos (diseño
          Nocturne) y ya no se personalizan desde acá.
        </p>
      </div>

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

      <section>
        <h2 className="font-display text-lg">Contacto</h2>
        <p className="mt-1 max-w-xl text-sm text-foreground/70">
          Número para el botón flotante de WhatsApp que ven los clientes en la tienda.
        </p>
        <div className="mt-4">
          <ContactForm initial={theme.whatsappNumber ?? ""} />
        </div>
      </section>
    </div>
  );
}
