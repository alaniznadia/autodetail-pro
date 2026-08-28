"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Kind = "favicon" | "logo" | "about";

export function SiteImageUpload({
  kind,
  label,
  hint,
  currentUrl,
}: {
  kind: Kind;
  label: string;
  hint?: string;
  currentUrl: string | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Elegí un archivo primero.");
      return;
    }

    setBusy(true);
    setError(null);

    const formData = new FormData();
    formData.append("kind", kind);
    formData.append("file", file);

    const res = await fetch("/api/admin/store-theme/upload", { method: "POST", body: formData });

    setBusy(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo subir la imagen.");
      return;
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    router.refresh();
  }

  async function handleRemove() {
    setBusy(true);
    setError(null);
    await fetch(`/api/admin/store-theme/upload?kind=${kind}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex max-w-md flex-col gap-3 rounded border border-border p-4">
      <div>
        <p className="font-display text-sm">{label}</p>
        {hint && <p className="mt-1 text-xs text-foreground/60">{hint}</p>}
      </div>

      {currentUrl && (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentUrl}
            alt=""
            className="h-16 w-16 rounded border border-border bg-white object-contain"
          />
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy}
            className="text-xs text-red-400 underline underline-offset-4 disabled:opacity-50"
          >
            Quitar
          </button>
        </div>
      )}

      <form onSubmit={handleUpload} className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded border border-accent px-4 py-2 font-display text-sm hover:bg-accent hover:text-background disabled:opacity-50"
        >
          {busy ? "Subiendo..." : "Subir"}
        </button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
