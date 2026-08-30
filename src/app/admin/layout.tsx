import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { BackButton } from "@/components/back-button";
import { PANEL_THEME_INIT_SCRIPT } from "@/lib/panel-theme";

const NAV = [
  { href: "/admin", label: "Panel" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/stock", label: "Stock" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/sucursales", label: "Sucursales" },
  { href: "/admin/proveedores", label: "Proveedores" },
  { href: "/admin/compras", label: "Compras" },
  { href: "/admin/envios", label: "Envíos" },
  { href: "/admin/cupones", label: "Cupones" },
  { href: "/admin/fidelidad", label: "Fidelidad" },
  { href: "/admin/resenas", label: "Reseñas" },
  { href: "/admin/apariencia", label: "Apariencia" },
  { href: "/admin/reportes", label: "Reportes" },
  { href: "/admin/usuarios", label: "Usuarios" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <script dangerouslySetInnerHTML={{ __html: PANEL_THEME_INIT_SCRIPT }} />
      <aside className="print:hidden border-b border-border p-4 md:w-56 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-lg font-bold">Epic Shine Admin</p>
          <ThemeToggle />
        </div>
        <Link
          href="/catalogo"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block w-fit rounded border border-border px-3 py-1.5 font-display text-xs hover:border-accent"
        >
          Ver tienda online
        </Link>
        <nav aria-label="Navegación del panel" className="mt-6 flex flex-row flex-wrap gap-3 md:flex-col">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-display text-sm text-foreground/80 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 border-t border-border pt-4 text-xs text-foreground/60">
          <p>{session?.user?.email}</p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="mt-2 underline underline-offset-4">
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-6 print:p-0">
        <BackButton className="print:hidden mb-4 text-sm text-foreground/70" />
        {children}
      </main>
    </div>
  );
}
