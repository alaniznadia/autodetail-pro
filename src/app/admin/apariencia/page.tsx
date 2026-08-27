import { getStoreTheme } from "@/lib/store-theme";
import { StoreThemeForm } from "@/components/admin/store-theme-form";

export const dynamic = "force-dynamic";

export default async function AdminAppearancePage() {
  const theme = await getStoreTheme();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Apariencia de la tienda</h1>
      <p className="mt-2 max-w-xl text-sm text-foreground/70">
        Estos cambios se aplican a la tienda pública (no al panel de administración
        ni al punto de venta).
      </p>
      <div className="mt-6">
        <StoreThemeForm
          initial={{
            headingFont: theme.headingFont,
            bodyFont: theme.bodyFont,
            baseFontSizePx: theme.baseFontSizePx,
            backgroundColor: theme.backgroundColor,
            textColor: theme.textColor,
            accentColor: theme.accentColor,
          }}
        />
      </div>
    </div>
  );
}
