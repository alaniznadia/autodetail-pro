"use client";

import { useState } from "react";
import { useAdaptiveFrameBg } from "@/components/store/use-adaptive-frame-bg";

type GalleryImage = { id: string; url: string; altText: string };

export function ProductGallery({ images }: { images: GalleryImage[] }) {
  const [selected, setSelected] = useState(0);
  const { bg, imgRef, reset } = useAdaptiveFrameBg();
  const main = images[selected];

  function selectImage(i: number) {
    reset();
    setSelected(i);
  }

  if (!main) return null;

  return (
    <div className="flex w-full shrink-0 flex-col gap-3 lg:w-[520px]">
      <div
        className="store-frame group relative aspect-square overflow-hidden border-border bg-surface"
        style={bg ? { backgroundColor: bg } : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={main.id}
          ref={imgRef}
          src={main.url}
          alt={main.altText}
          crossOrigin="anonymous"
          className="h-full w-full object-contain p-6 transition-transform duration-300 ease-out group-hover:scale-110"
        />
      </div>
      {images.length > 1 ? (
        <div className="grid grid-cols-4 gap-3">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => selectImage(i)}
              aria-label={`Ver imagen ${i + 1} de ${images.length}`}
              aria-current={i === selected ? "true" : undefined}
              className={`store-frame aspect-square overflow-hidden bg-surface p-1.5 ${
                i === selected ? "border-accent" : "border-border"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
