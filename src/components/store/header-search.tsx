"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Ícono de lupa que despliega un input inline; al enviarlo navega a
// /catalogo?q=... (mismo filtro por nombre que ya soporta esa página).
export function HeaderSearch() {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = inputRef.current?.value.trim();
    setOpen(false);
    router.push(q ? `/catalogo?q=${encodeURIComponent(q)}` : "/catalogo");
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buscar productos"
        className="flex items-center justify-center rounded border border-border p-1.5 text-foreground/90 hover:text-foreground"
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
          <path d="m21 21-4.3-4.3" />
        </svg>
      </button>
    );
  }

  return (
    <form onSubmit={submit} role="search" className="flex items-center gap-1.5">
      <input
        ref={inputRef}
        type="search"
        name="q"
        placeholder="Buscar productos…"
        aria-label="Buscar productos"
        onBlur={() => setOpen(false)}
        className="w-32 rounded border border-border bg-transparent px-2.5 py-1.5 text-[18px] outline-none focus:border-accent sm:w-48"
      />
    </form>
  );
}
