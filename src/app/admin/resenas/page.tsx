import { prisma } from "@/lib/prisma";
import { ReviewsModerationPanel } from "@/components/admin/reviews-moderation-panel";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const reviews = await prisma.review.findMany({
    include: {
      product: { select: { name: true, slug: true } },
      customer: { select: { name: true, email: true } },
    },
    // Pendientes primero: son las que necesitan una decisión.
    orderBy: [{ approved: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Reseñas</h1>
      <p className="mt-2 max-w-xl text-sm text-foreground/70">
        Las reseñas nuevas quedan pendientes hasta que las aprobás acá; recién ahí se
        muestran en la ficha del producto.
      </p>
      <div className="mt-6">
        <ReviewsModerationPanel
          reviews={reviews.map((r) => ({
            id: r.id,
            productName: r.product.name,
            productSlug: r.product.slug,
            customerName: r.customer.name ?? r.customer.email,
            rating: r.rating,
            comment: r.comment,
            approved: r.approved,
            createdAt: r.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
