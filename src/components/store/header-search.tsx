"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

type Suggestion = { slug: string; name: string; price: string; imageUrl: string | null };

const DEBOUNCE_MS = 250;

export function HeaderSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();

    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  useEffect(() => {
    // Con menos de 2 caracteres no se busca nada; el panel de resultados
    // ya está oculto para ese caso (ver el render más abajo), así que no
    // hace falta limpiar `results` acá.
    if (query.trim().length < 2) return;

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/products/suggest?q=${encodeURIComponent(query.trim())}`)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) setResults(data.results ?? []);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  function goToResults() {
    if (!query.trim()) return;
    setOpen(false);
    router.push(`/catalogo?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Buscar productos"
        className="flex h-9 w-9 items-center justify-center rounded border border-border hover:border-accent"
      >
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
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded border border-border bg-background shadow-lg sm:w-80">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              goToResults();
            }}
            className="p-3"
          >
            <label htmlFor="header-search-input" className="sr-only">
              Buscar productos
            </label>
            <input
              ref={inputRef}
              id="header-search-input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar productos..."
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
            />
          </form>

          {query.trim().length >= 2 && (
            <div className="max-h-80 overflow-y-auto border-t border-border">
              {loading ? (
                <p className="p-3 text-sm text-foreground/60">Buscando...</p>
              ) : results.length === 0 ? (
                <p className="p-3 text-sm text-foreground/60">Sin resultados.</p>
              ) : (
                <>
                  <ul>
                    {results.map((r) => (
                      <li key={r.slug}>
                        <Link
                          href={`/producto/${r.slug}`}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-foreground/5"
                        >
                          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-white">
                            {r.imageUrl && (
                              <Image src={r.imageUrl} alt="" fill sizes="40px" className="object-contain" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm">{r.name}</span>
                            <span className="block text-xs text-foreground/60">${r.price}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={goToResults}
                    className="block w-full border-t border-border px-3 py-2 text-center text-sm text-foreground/70 hover:text-foreground"
                  >
                    Ver todos los resultados
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
