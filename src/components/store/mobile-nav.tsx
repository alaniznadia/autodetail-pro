"use client";

import { useState } from "react";
import Link from "next/link";

type Category = { slug: string; name: string };

// Botón "Catálogo" a la izquierda del header. Al tocarlo despliega
// directamente sus categorías, sin pasar primero por un menú hamburguesa
// genérico ni por un nav de texto aparte.
export function MobileNav({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);

  function close() {
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-catalog-panel"
        className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 font-display text-sm text-foreground/80 hover:text-foreground"
      >
        Catálogo
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          id="mobile-catalog-panel"
          className="absolute left-0 top-full z-50 mt-2 w-56 rounded border border-border bg-background py-2 shadow-lg"
        >
          <ul className="flex flex-col">
            <li>
              <Link
                href="/catalogo"
                onClick={close}
                className="block px-4 py-2 font-display text-sm text-foreground/80 hover:text-foreground"
              >
                Ver todo
              </Link>
            </li>
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/catalogo?categoria=${category.slug}`}
                  onClick={close}
                  className="block px-4 py-2 text-sm text-foreground/70 hover:text-foreground"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
