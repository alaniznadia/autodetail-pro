"use client";

import { useCallback, useState } from "react";

/**
 * Las fotos de producto reales traen su propio fondo (blanco, negro, etc.)
 * que no siempre combina con el marco oscuro de la tienda. Al cargar la
 * imagen, muestreamos sus esquinas para elegir el fondo del marco (blanco
 * o negro) y que la foto se vea integrada en vez de recortada sobre un
 * recuadro de otro color.
 *
 * Se usa un ref callback (no onLoad) porque estas imágenes vienen en el
 * HTML renderizado por el servidor: el evento "load" del navegador ya
 * disparó antes de que React hidrate y enganche cualquier listener, así
 * que hay que revisar "img.complete" apenas se monta el elemento.
 */
export function useAdaptiveFrameBg() {
  const [bg, setBg] = useState<string | null>(null);

  const reset = useCallback(() => setBg(null), []);

  const process = useCallback((img: HTMLImageElement) => {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const corners: [number, number][] = [
        [1, 1],
        [w - 2, 1],
        [1, h - 2],
        [w - 2, h - 2],
      ];
      let sum = 0;
      for (const [x, y] of corners) {
        const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
        sum += 0.299 * r + 0.587 * g + 0.114 * b;
      }
      setBg(sum / corners.length > 200 ? "#ffffff" : "#000000");
    } catch {
      // Imagen externa sin CORS habilitado: el canvas queda "tainted" y no
      // se puede leer. Se deja el fondo por defecto (bg-surface).
    }
  }, []);

  const imgRef = useCallback(
    (img: HTMLImageElement | null) => {
      if (!img) return;
      if (img.complete && img.naturalWidth > 0) {
        process(img);
      } else {
        img.addEventListener("load", () => process(img), { once: true });
      }
    },
    [process]
  );

  return { bg, imgRef, reset };
}
