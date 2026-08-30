"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Banner = {
  id: string;
  imageUrl: string;
  altText: string;
  linkUrl: string | null;
};

const AUTO_ADVANCE_MS = 5000;

export function HeroCarousel({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (banners.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [banners.length]);

  const current = banners[index];
  if (!current) return null;

  const slide = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current.imageUrl}
      alt={current.altText}
      className="h-full w-full object-cover"
    />
  );

  return (
    <div className="relative h-[420px] overflow-hidden sm:h-[520px]">
      {current.linkUrl ? <Link href={current.linkUrl}>{slide}</Link> : slide}

      {banners.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => setIndex((i) => (i - 1 + banners.length) % banners.length)}
            aria-label="Anterior"
            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 text-[22px] hover:bg-background"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % banners.length)}
            aria-label="Siguiente"
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 text-[22px] hover:bg-background"
          >
            ›
          </button>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {banners.map((banner, i) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Ir a la imagen ${i + 1}`}
                aria-current={i === index}
                className={`h-2 w-2 rounded-full transition ${
                  i === index ? "bg-accent" : "bg-background/70"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
