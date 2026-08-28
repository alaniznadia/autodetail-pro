import Link from "next/link";
import { CartLink } from "@/components/store/cart-link";
import { MobileNav } from "@/components/store/mobile-nav";
import { auth } from "@/lib/auth";

const NAV_LINKS = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/catalogo?categoria=ceras", label: "Ceras" },
  { href: "/catalogo?categoria=shampoo", label: "Shampoo" },
  { href: "/catalogo?categoria=microfibras", label: "Microfibras" },
  { href: "/sobre-nosotros", label: "Sobre nosotros" },
];

export async function SiteHeader({ logoUrl }: { logoUrl: string | null }) {
  const session = await auth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-accent focus:px-4 focus:py-2 focus:text-background"
      >
        Saltar al contenido principal
      </a>
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="flex items-center font-display text-xl font-bold tracking-widest">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Epic Shine" className="h-9 w-auto object-contain" />
          ) : (
            "Epic Shine"
          )}
        </Link>
        <nav aria-label="Navegación principal" className="hidden gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-display text-sm text-foreground/80 transition hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 sm:gap-4">
          <MobileNav links={NAV_LINKS} />
          <CartLink />
          <Link
            href={session?.user ? "/mi-cuenta" : "/login"}
            aria-label={session?.user ? "Ver mi cuenta" : "Ingresar a mi cuenta"}
            className="font-display text-sm hover:text-foreground/80"
          >
            Mi cuenta
          </Link>
        </div>
      </div>
    </header>
  );
}
