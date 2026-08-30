"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ContactForm({ initial }: { initial: string }) {
  const router = useRouter();
  const [whatsappNumber, setWhatsappNumber] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/admin/store-theme/contact", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ whatsappNumber }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo guardar.");
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-3">
      <div>
        <label htmlFor="whatsapp-number" className="block text-sm">
          Número de WhatsApp
        </label>
        <input
          id="whatsapp-number"
          value={whatsappNumber}
          onChange={(e) => {
            setWhatsappNumber(e.target.value.replace(/[^\d]/g, ""));
            setSaved(false);
          }}
          placeholder="5491122334455"
          className="mt-1 w-full max-w-xs rounded border border-border bg-background px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-foreground/60">
          Código de país + número, solo dígitos (sin +, espacios ni guiones). Dejalo
          vacío para ocultar el botón flotante de la tienda.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      {saved && !error && (
        <p role="status" className="text-sm text-green-500">
          Cambios guardados.
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-fit rounded border border-accent px-6 py-2 font-display text-sm hover:bg-accent hover:text-background disabled:opacity-50"
      >
        {submitting ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
