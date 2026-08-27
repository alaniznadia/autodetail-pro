"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReviewForm({
  productId,
  initial,
}: {
  productId: string;
  initial?: { rating: number; comment: string | null };
}) {
  const router = useRouter();
  const [rating, setRating] = useState(initial?.rating ?? 5);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/products/${productId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment: comment || undefined }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo guardar la reseña.");
      return;
    }

    setDone(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex max-w-md flex-col gap-3 rounded border border-border p-4">
      <fieldset>
        <legend className="font-display text-sm">Tu calificación</legend>
        <div className="mt-2 flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              aria-label={`${value} de 5 estrellas`}
              aria-pressed={rating === value}
              className={`text-2xl ${value <= rating ? "text-accent" : "text-foreground/30"}`}
            >
              ★
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="review-comment" className="block text-sm">
          Comentario (opcional)
        </label>
        <textarea
          id="review-comment"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      {done && !error && (
        <p role="status" className="text-sm text-green-500">
          ¡Gracias por tu reseña!
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="w-fit rounded border border-accent px-4 py-2 font-display text-sm hover:bg-accent hover:text-background disabled:opacity-50"
      >
        {submitting ? "Guardando..." : initial ? "Actualizar reseña" : "Publicar reseña"}
      </button>
    </form>
  );
}
