import Link from "next/link";
import { CartLink } from "@/components/store/cart-link";
import { HeaderSearch } from "@/components/store/header-search";
import { MobileNav } from "@/components/store/mobile-nav";
import { StoreThemeToggle } from "@/components/store/store-theme-toggle";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStoreSettings } from "@/lib/store-settings";

const money = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");

export async function SiteHeader({ logoUrl }: { logoUrl: string | null }) {
  const [session, categories, settings] = await Promise.all([
    auth(),
    prisma.category.findMany({
      where: { parentId: null },
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    }),
    getStoreSettings(),
  ]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      {settings.freeShippingFrom && (
        <p className="bg-accent px-4 py-1.5 text-center text-[16.5px] font-medium text-background">
          Envío gratis en compras desde {money(Number(settings.freeShippingFrom))}
        </p>
      )}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-accent focus:px-4 focus:py-2 focus:text-background"
      >
        Saltar al contenido principal
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="flex items-center font-display text-[24px] font-bold tracking-widest">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Epic Shine" className="h-9 w-auto object-contain" />
          ) : (
            "Epic Shine"
          )}
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <MobileNav categories={categories} />
          <Link href="/sobre-nosotros" className="font-display text-[18px] hover:text-foreground/90">
            Sobre nosotros
          </Link>
          <HeaderSearch />
          <StoreThemeToggle />
          <CartLink />
          <Link
            href={session?.user ? "/mi-cuenta" : "/login"}
            aria-label={session?.user ? "Ver mi cuenta" : "Ingresar a mi cuenta"}
            className="font-display text-[18px] hover:text-foreground/90"
          >
            Mi cuenta
          </Link>
        </div>
      </div>
    </header>
  );
}
