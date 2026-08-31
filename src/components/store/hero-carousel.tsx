"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

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

  if (banners.length === 0) return null;

  return (
    <div className="relative h-[420px] overflow-hidden sm:h-[520px]">
      {/* Los banners están todos montados (con opacidad 0 salvo el actual)
          en vez de solo el actual, para que next/image ya los haya
          descargado cuando les toca el turno — si se montara solo el
          activo, cada avance automático mostraría un parpadeo mientras se
          pide la imagen siguiente recién al cambiar. */}
      {banners.map((banner, i) => {
        const isCurrent = i === index;
        const slide = (
          <Image
            src={banner.imageUrl}
            alt={banner.altText}
            fill
            sizes="100vw"
            className="object-cover"
            priority={i === 0}
          />
        );
        return (
          <div
            key={banner.id}
            aria-hidden={!isCurrent}
            className={`absolute inset-0 transition-opacity duration-500 ${
              isCurrent ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            {banner.linkUrl ? (
              <Link href={banner.linkUrl} className="block h-full w-full" tabIndex={isCurrent ? 0 : -1}>
                {slide}
              </Link>
            ) : (
              slide
            )}
          </div>
        );
      })}

      {banners.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => setIndex((i) => (i - 1 + banners.length) % banners.length)}
            aria-label="Anterior"
            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 text-lg hover:bg-background"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % banners.length)}
            aria-label="Siguiente"
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 text-lg hover:bg-background"
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
