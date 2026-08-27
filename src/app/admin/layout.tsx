import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

const NAV = [
  { href: "/admin", label: "Panel" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/stock", label: "Stock" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/proveedores", label: "Proveedores" },
  { href: "/admin/compras", label: "Compras" },
  { href: "/admin/envios", label: "Envíos" },
  { href: "/admin/cupones", label: "Cupones" },
  { href: "/admin/apariencia", label: "Apariencia" },
  { href: "/admin/reportes", label: "Reportes" },
  { href: "/admin/usuarios", label: "Usuarios" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-border p-4 md:w-56 md:border-b-0 md:border-r">
        <p className="font-display text-lg font-bold">Epic Shine Admin</p>
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
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
