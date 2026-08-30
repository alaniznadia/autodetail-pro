"use client";

import { useEffect } from "react";

const STORAGE_KEY = "epicshine_recently_viewed";
const MAX_ITEMS = 12;

// Registra el slug visitado en localStorage (más reciente primero, sin
// duplicados) para que la home pueda armar un bloque de "Recién vistos".
export function TrackRecentlyViewed({ slug }: { slug: string }) {
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const prev: string[] = raw ? JSON.parse(raw) : [];
      const next = [slug, ...prev.filter((s) => s !== slug)].slice(0, MAX_ITEMS);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage no disponible: no pasa nada, simplemente no se registra
    }
  }, [slug]);

  return null;
}
