import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { PANEL_THEME_INIT_SCRIPT } from "@/lib/panel-theme";

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "EMPLOYEE") redirect("/");

  return (
    <div className="min-h-screen">
      <script dangerouslySetInnerHTML={{ __html: PANEL_THEME_INIT_SCRIPT }} />
      <header className="print:hidden flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <p className="font-display text-lg font-bold">Epic Shine POS</p>
          <nav aria-label="Navegación del POS" className="flex flex-wrap gap-4">
            <Link href="/pos" className="font-display text-sm text-foreground/80 hover:text-foreground">
              Vender
            </Link>
            <Link
              href="/pos/caja"
              className="font-display text-sm text-foreground/80 hover:text-foreground"
            >
              Caja
            </Link>
            <Link
              href="/pos/ventas"
              className="font-display text-sm text-foreground/80 hover:text-foreground"
            >
              Ventas
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm sm:gap-4">
          <ThemeToggle />
          <span className="hidden text-foreground/60 sm:inline">{session?.user?.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="underline underline-offset-4">
              Salir
            </button>
          </form>
        </div>
      </header>
      <main className="p-0 md:p-4 print:p-0">{children}</main>
    </div>
  );
}
