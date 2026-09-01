"use client";

import { useState } from "react";

export function ShareButton({
  url,
  title,
  className = "",
}: {
  url: string;
  title: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // el usuario canceló el share nativo: no hacemos nada
      }
      return;
    }
    setOpen((o) => !o);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard no disponible: el link queda visible en la barra de direcciones igual
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        aria-label="Compartir producto"
        className={`flex items-center justify-center rounded-full text-foreground/70 hover:text-foreground ${className}`}
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.6 10.5 15.4 6.5M8.6 13.5 15.4 17.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-44 rounded border border-border bg-background py-2 shadow-lg">
          <button
            type="button"
            onClick={() => {
              copyLink();
              setOpen(false);
            }}
            className="block w-full px-4 py-2 text-left text-sm text-foreground/90 hover:text-foreground"
          >
            Copiar link
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="block w-full px-4 py-2 text-left text-sm text-foreground/90 hover:text-foreground"
          >
            WhatsApp
          </a>
        </div>
      )}

      {copied && (
        <p role="status" className="absolute right-0 top-full mt-2 whitespace-nowrap text-xs text-accent">
          Link copiado
        </p>
      )}
    </div>
  );
}
