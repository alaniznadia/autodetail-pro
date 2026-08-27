import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-6">
          <p className="font-display text-lg font-bold">Epic Shine POS</p>
          <nav aria-label="Navegación del POS" className="flex gap-4">
            <Link href="/pos" className="font-display text-sm text-foreground/80 hover:text-foreground">
              Vender
            </Link>
            <Link
              href="/pos/caja"
              className="font-display text-sm text-foreground/80 hover:text-foreground"
            >
              Caja
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-foreground/60">{session?.user?.email}</span>
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
      <main className="p-4">{children}</main>
    </div>
  );
}
