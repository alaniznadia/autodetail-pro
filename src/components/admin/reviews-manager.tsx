"use client";

import { useRouter } from "next/navigation";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  customer: { name: string | null };
};

export function ReviewsManager({ reviews }: { reviews: Review[] }) {
  const router = useRouter();

  async function handleDelete(id: string) {
    await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="mt-10 max-w-2xl">
      <h2 className="font-display text-lg">Reseñas</h2>

      {reviews.length === 0 ? (
        <p className="mt-2 text-sm text-foreground/60">Este producto todavía no tiene reseñas.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {reviews.map((review) => (
            <li key={review.id} className="rounded border border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span>
                  {review.customer.name ?? "Cliente"} — {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(review.id)}
                  aria-label={`Borrar reseña de ${review.customer.name ?? "cliente"}`}
                  className="text-xs text-red-400 underline underline-offset-4"
                >
                  Borrar
                </button>
              </div>
              {review.comment && <p className="mt-1 text-foreground/80">{review.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
