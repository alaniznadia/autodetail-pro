"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Banner = {
  id: string;
  imageUrl: string;
  altText: string;
  linkUrl: string | null;
  active: boolean;
};

export function StoreBannersManager({ banners }: { banners: Banner[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [altText, setAltText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Elegí un archivo primero.");
      return;
    }

    setBusy(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("altText", altText);
    formData.append("linkUrl", linkUrl);

    const res = await fetch("/api/admin/store-banners", { method: "POST", body: formData });

    setBusy(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo subir el banner.");
      return;
    }

    setAltText("");
    setLinkUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    router.refresh();
  }

  async function toggleActive(id: string, active: boolean) {
    setBusy(true);
    await fetch(`/api/admin/store-banners/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    setBusy(false);
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(true);
    await fetch(`/api/admin/store-banners/${id}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="max-w-2xl">
      {banners.length > 0 && (
        <ul className="flex flex-col gap-3">
          {banners.map((banner) => (
            <li
              key={banner.id}
              className="flex flex-wrap items-center gap-3 rounded border border-border p-3 text-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={banner.imageUrl}
                alt={banner.altText}
                className="h-14 w-24 rounded border border-border bg-white object-contain"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate">{banner.altText}</p>
                {banner.linkUrl && (
                  <p className="truncate text-xs text-foreground/60">{banner.linkUrl}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => toggleActive(banner.id, !banner.active)}
                disabled={busy}
                className="text-xs underline underline-offset-4 disabled:opacity-50"
              >
                {banner.active ? "Desactivar" : "Activar"}
              </button>
              <button
                type="button"
                onClick={() => remove(banner.id)}
                disabled={busy}
                className="text-xs text-red-400 underline underline-offset-4 disabled:opacity-50"
              >
                Borrar
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={handleAdd}
        className="mt-4 flex flex-col gap-3 rounded border border-border p-4 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="banner-file" className="block text-sm">
            Imagen (JPG, PNG o WEBP, hasta 5 MB)
          </label>
          <input
            id="banner-file"
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="banner-alt" className="block text-sm">
            Texto alternativo
          </label>
          <input
            id="banner-alt"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Ej: Promo de verano"
            className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="banner-link" className="block text-sm">
            Link al hacer click (opcional)
          </label>
          <input
            id="banner-link"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="/catalogo?categoria=ceras"
            className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded border border-accent px-4 py-2 font-display text-sm hover:bg-accent hover:text-background disabled:opacity-50"
        >
          {busy ? "Subiendo..." : "Agregar banner"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
