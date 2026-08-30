"use client";

/**
 * Piezas de la tienda pública (mismo diseño en cualquier tamaño de pantalla).
 *
 * - <MobileStoreBar>: barra inferior fija con total y CTA, solo si hay algo
 *   en el carrito.
 * - <MobileFilterChips>: fila de categorías scrolleable horizontal.
 * - <MobileCheckoutSteps>: indicador de pasos del checkout.
 *
 * Todas leen el carrito del CartContext ya existente
 * (src/components/store/cart-context.tsx) — no agregan estado nuevo.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/store/cart-context";

const money = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");

export function MobileStoreBar({ href = "/carrito", label = "Ver carrito" }: { href?: string; label?: string }) {
  const pathname = usePathname();
  const { items } = useCart();
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);

  // En el checkout ya hay un botón fijo abajo para confirmar el pedido; esta
  // barra duplicaría esa misma posición.
  if (count === 0 || pathname?.startsWith("/checkout")) return null;

  return (
    <div className="sticky bottom-0 z-40 flex items-center gap-3 border-t border-border bg-background px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-3">
      <p className="flex-1 text-[16px] text-foreground/78">
        {count} {count === 1 ? "producto" : "productos"} · {money(subtotal)}
      </p>
      <Link
        href={href}
        className="rounded border border-accent px-5 py-3 font-display text-[18px] hover:bg-accent hover:text-background"
      >
        {label}
      </Link>
    </div>
  );
}

export function MobileFilterChips({
  categories,
  active,
}: {
  categories: { slug: string; name: string }[];
  active?: string;
}) {
  return (
    <nav
      aria-label="Categorías"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <Link
        href="/catalogo"
        className={`shrink-0 rounded-full border px-3 py-1.5 text-[16px] ${
          !active ? "border-accent text-accent" : "border-border text-foreground/85"
        }`}
      >
        Todo
      </Link>
      {categories.map((c) => (
        <Link
          key={c.slug}
          href={`/catalogo?categoria=${c.slug}`}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-[16px] ${
            active === c.slug ? "border-accent text-accent" : "border-border text-foreground/85"
          }`}
        >
          {c.name}
        </Link>
      ))}
    </nav>
  );
}

export function MobileCheckoutSteps({ step }: { step: 1 | 2 | 3 }) {
  const steps = ["Datos", "Entrega", "Pago"];
  return (
    <ol className="mb-4 flex max-w-xs gap-2" aria-label="Pasos del checkout">
      {steps.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const done = n <= step;
        return (
          <li key={label} className="flex flex-1 flex-col gap-1.5">
            <span
              className={`h-0.5 w-full rounded ${done ? "bg-accent" : "bg-border"}`}
              aria-hidden
            />
            <span className={`text-[16.5px] ${done ? "text-foreground" : "text-foreground/62"}`}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
