"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FavoriteButton({
  productId,
  initialFavorited,
  loggedIn,
  className = "",
}: {
  productId: string;
  initialFavorited: boolean;
  loggedIn: boolean;
  className?: string;
}) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!loggedIn) {
      router.push("/login");
      return;
    }
    if (pending) return;

    const next = !favorited;
    setFavorited(next);
    setPending(true);
    try {
      const res = next
        ? await fetch("/api/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId }),
          })
        : await fetch(`/api/favorites?productId=${productId}`, { method: "DELETE" });
      if (!res.ok) setFavorited(!next);
    } catch {
      setFavorited(!next);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={favorited}
      aria-label={favorited ? "Quitar de favoritos" : "Agregar a favoritos"}
      className={`flex items-center justify-center rounded-full transition-colors ${
        favorited ? "text-accent" : "text-foreground/70 hover:text-foreground"
      } ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill={favorited ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
      </svg>
    </button>
  );
}
