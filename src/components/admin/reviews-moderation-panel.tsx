"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Review = {
  id: string;
  productName: string;
  productSlug: string;
  customerName: string;
  rating: number;
  comment: string | null;
  approved: boolean;
  createdAt: string;
};

export function ReviewsModerationPanel({ reviews }: { reviews: Review[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function approve(id: string) {
    setBusyId(id);
    await fetch(`/api/admin/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: true }),
    });
    setBusyId(null);
    router.refresh();
  }

  async function reject(id: string) {
    if (!confirm("¿Eliminar esta reseña? No se puede deshacer.")) return;
    setBusyId(id);
    await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
    setBusyId(null);
    router.refresh();
  }

  if (reviews.length === 0) {
    return <p className="text-sm text-foreground/60">Todavía no hay reseñas.</p>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {reviews.map((review) => (
        <li key={review.id} className="rounded border border-border p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <Link
                href={`/producto/${review.productSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-display underline underline-offset-4"
              >
                {review.productName}
              </Link>
              <span className="ml-2 text-foreground/60">— {review.customerName}</span>
            </div>
            <span
              className={`rounded px-2 py-0.5 text-xs font-display uppercase ${
                review.approved
                  ? "border border-green-600 text-green-500"
                  : "border border-yellow-600 text-yellow-500"
              }`}
            >
              {review.approved ? "Aprobada" : "Pendiente"}
            </span>
          </div>
          <p className="mt-2 text-accent" aria-label={`${review.rating} de 5 estrellas`}>
            {"★".repeat(review.rating)}
            <span className="text-foreground/30">{"★".repeat(5 - review.rating)}</span>
          </p>
          {review.comment && <p className="mt-1 text-foreground/80">{review.comment}</p>}
          <p className="mt-1 text-xs text-foreground/50">
            {new Date(review.createdAt).toLocaleDateString("es-AR")}
          </p>
          <div className="mt-3 flex gap-3">
            {!review.approved && (
              <button
                type="button"
                onClick={() => approve(review.id)}
                disabled={busyId === review.id}
                className="rounded border border-accent px-3 py-1.5 font-display text-xs hover:bg-accent hover:text-background disabled:opacity-50"
              >
                Aprobar
              </button>
            )}
            <button
              type="button"
              onClick={() => reject(review.id)}
              disabled={busyId === review.id}
              className="rounded border border-red-500 px-3 py-1.5 font-display text-xs text-red-400 hover:bg-red-500 hover:text-background disabled:opacity-50"
            >
              Eliminar
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
