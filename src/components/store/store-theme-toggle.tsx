"use client";

import { useSyncExternalStore } from "react";
import { STORE_THEME_TOGGLE_KEY } from "@/lib/store-panel-theme";

type Mode = "light" | "dark";

const listeners = new Set<() => void>();

// El script anti-flash de (store)/layout.tsx ya corrigió el atributo del
// DOM antes de esto; getSnapshot lee el valor real apenas React puede
// usarlo sin generar un mismatch de hidratación (ver useSyncExternalStore).
function getSnapshot(): Mode {
  return document.getElementById("store-root")?.getAttribute("data-theme") === "light" ? "light" : "dark";
}

function getServerSnapshot(): Mode {
  return "dark";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setMode(mode: Mode) {
  const el = document.getElementById("store-root");
  if (mode === "light") el?.setAttribute("data-theme", "light");
  else el?.removeAttribute("data-theme");
  try {
    localStorage.setItem(STORE_THEME_TOGGLE_KEY, mode);
  } catch {
    // localStorage no disponible: el toggle sigue funcionando en esta visita
  }
  listeners.forEach((notify) => notify());
}

export function StoreThemeToggle() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <button
      type="button"
      onClick={() => setMode(mode === "dark" ? "light" : "dark")}
      aria-label={mode === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={mode === "dark" ? "Modo claro" : "Modo oscuro"}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-border hover:border-accent"
    >
      {mode === "dark" ? (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        </svg>
      )}
    </button>
  );
}
