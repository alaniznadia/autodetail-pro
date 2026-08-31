"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[tienda] Error no manejado", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
      <h1 className="font-display text-2xl font-bold">Algo salió mal</h1>
      <p className="mt-3 text-foreground/70">
        Tuvimos un problema para mostrar esta página. Podés intentar de nuevo o volver al
        catálogo.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded border border-accent px-6 py-3 font-display text-sm hover:bg-accent hover:text-background"
        >
          Reintentar
        </button>
        <Link
          href="/catalogo"
          className="rounded border border-border px-6 py-3 font-display text-sm hover:border-accent"
        >
          Ver catálogo
        </Link>
      </div>
    </div>
  );
}
