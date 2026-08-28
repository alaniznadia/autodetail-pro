"use client";

import { useSyncExternalStore } from "react";
import { PANEL_THEME_STORAGE_KEY } from "@/lib/panel-theme";

type Theme = "light" | "dark";

const listeners = new Set<() => void>();

// El server siempre "ve" oscuro (no tiene localStorage); el script
// anti-flash del layout ya corrigió el atributo del DOM antes de esto,
// así que getSnapshot lee el valor real apenas React puede usarlo sin
// generar un mismatch de hidratación (ver useSyncExternalStore).
function getSnapshot(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

function getServerSnapshot(): Theme {
  return "dark";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(PANEL_THEME_STORAGE_KEY, theme);
  listeners.forEach((notify) => notify());
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label={theme === "dark" ? "Cambiar a pantalla clara" : "Cambiar a pantalla oscura"}
      title={theme === "dark" ? "Pantalla clara" : "Pantalla oscura"}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-border hover:border-accent"
    >
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        </svg>
      )}
    </button>
  );
}
