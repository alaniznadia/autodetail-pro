"use client";

import { useState } from "react";
import Link from "next/link";

type Category = { slug: string; name: string };

export function MobileNav({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);

  function closeAll() {
    setOpen(false);
    setCatalogOpen(false);
  }

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        className="flex h-9 w-9 items-center justify-center rounded border border-border"
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      {open && (
        <nav
          id="mobile-nav-panel"
          aria-label="Navegación principal"
          className="absolute inset-x-0 top-full border-b border-border bg-background px-4 py-2"
        >
          <ul className="flex flex-col">
            <li className="border-b border-border py-1 last:border-0">
              <button
                type="button"
                onClick={() => setCatalogOpen((o) => !o)}
                aria-expanded={catalogOpen}
                aria-controls="mobile-catalog-submenu"
                className="flex w-full items-center justify-between py-2 font-display text-sm text-foreground/80 hover:text-foreground"
              >
                Catálogo
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className={`shrink-0 transition-transform ${catalogOpen ? "rotate-180" : ""}`}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {catalogOpen && (
                <ul id="mobile-catalog-submenu" className="ml-3 flex flex-col border-l border-border pl-3">
                  <li>
                    <Link
                      href="/catalogo"
                      onClick={closeAll}
                      className="block py-2 text-sm text-foreground/70 hover:text-foreground"
                    >
                      Ver todo
                    </Link>
                  </li>
                  {categories.map((category) => (
                    <li key={category.slug}>
                      <Link
                        href={`/catalogo?categoria=${category.slug}`}
                        onClick={closeAll}
                        className="block py-2 text-sm text-foreground/70 hover:text-foreground"
                      >
                        {category.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
            <li className="py-1">
              <Link
                href="/sobre-nosotros"
                onClick={closeAll}
                className="block py-2 font-display text-sm text-foreground/80 hover:text-foreground"
              >
                Sobre nosotros
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
