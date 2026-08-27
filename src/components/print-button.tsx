"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden rounded border border-accent px-4 py-2 font-display text-sm hover:bg-accent hover:text-background"
    >
      Imprimir
    </button>
  );
}
