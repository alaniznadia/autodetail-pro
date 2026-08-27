"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type ProductImage = {
  id: string;
  url: string;
  altText: string;
};

export function ProductImagesManager({
  productId,
  images,
}: {
  productId: string;
  images: ProductImage[];
}) {
  const router = useRouter();
  const [altText, setAltText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Elegí un archivo primero.");
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("altText", altText);

    const res = await fetch(`/api/admin/products/${productId}/images`, {
      method: "POST",
      body: formData,
    });

    setUploading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo subir la imagen.");
      return;
    }

    setAltText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    router.refresh();
  }

  async function handleDelete(imageId: string) {
    await fetch(`/api/admin/products/${productId}/images/${imageId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="mt-10 max-w-2xl">
      <h2 className="font-display text-lg">Imágenes</h2>

      {images.length > 0 && (
        <ul className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-4">
          {images.map((img) => (
            <li key={img.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.altText}
                className="aspect-square w-full rounded border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => handleDelete(img.id)}
                aria-label={`Borrar imagen: ${img.altText}`}
                className="mt-1 w-full text-xs text-red-400 underline underline-offset-4"
              >
                Borrar
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleUpload} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="image-file" className="block text-sm">
            Archivo (JPG, PNG o WEBP, hasta 5 MB)
          </label>
          <input
            id="image-file"
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="image-alt" className="block text-sm">
            Texto alternativo
          </label>
          <input
            id="image-alt"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Ej: Shampoo pH Neutro 500ml"
            className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={uploading}
          className="rounded border border-accent px-4 py-2 font-display text-sm hover:bg-accent hover:text-background disabled:opacity-50"
        >
          {uploading ? "Subiendo..." : "Subir"}
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
