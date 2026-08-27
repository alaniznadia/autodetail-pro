import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { upsertReview, ReviewNotAllowedError } from "@/lib/reviews";

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id: productId } = await params;
  const body = await req.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const review = await upsertReview({
      productId,
      customerId: session.user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    });
    return NextResponse.json({ review }, { status: 201 });
  } catch (err) {
    if (err instanceof ReviewNotAllowedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("Error guardando reseña", err);
    return NextResponse.json({ error: "No se pudo guardar la reseña." }, { status: 500 });
  }
}
