"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AboutForm({
  initial,
}: {
  initial: { aboutTitle: string; aboutContent: string };
}) {
  const router = useRouter();
  const [aboutTitle, setAboutTitle] = useState(initial.aboutTitle);
  const [aboutContent, setAboutContent] = useState(initial.aboutContent);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/admin/store-theme/about", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aboutTitle, aboutContent }),
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
        <label htmlFor="about-title" className="block text-sm">
          Título
        </label>
        <input
          id="about-title"
          value={aboutTitle}
          onChange={(e) => {
            setAboutTitle(e.target.value);
            setSaved(false);
          }}
          placeholder="Sobre nosotros"
          className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="about-content" className="block text-sm">
          Texto
        </label>
        <textarea
          id="about-content"
          rows={6}
          value={aboutContent}
          onChange={(e) => {
            setAboutContent(e.target.value);
            setSaved(false);
          }}
          placeholder="Contá la historia de Epic Shine..."
          className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
        />
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
