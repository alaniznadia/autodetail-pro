"use client";

import { useState } from "react";
import Image from "next/image";

type ProductImage = { id: string; url: string; altText: string };

export function ProductGallery({ images }: { images: ProductImage[] }) {
  const [selected, setSelected] = useState(0);

  if (images.length === 0) {
    return <div className="aspect-square overflow-hidden rounded bg-white" />;
  }

  const current = images[selected] ?? images[0];

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded bg-white">
        <Image
          src={current.url}
          alt={current.altText}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-contain"
          priority
        />
      </div>

      {images.length > 1 && (
        <div className="mt-3 flex gap-2" role="tablist" aria-label="Fotos del producto">
          {images.map((image, i) => (
            <button
              key={image.id}
              type="button"
              role="tab"
              aria-selected={i === selected}
              aria-label={`Ver foto ${i + 1} de ${images.length}`}
              onClick={() => setSelected(i)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded border bg-white transition ${
                i === selected ? "border-accent" : "border-border hover:border-accent/50"
              }`}
            >
              <Image src={image.url} alt="" fill sizes="64px" className="object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
