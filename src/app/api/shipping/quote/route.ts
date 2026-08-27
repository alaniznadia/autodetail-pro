import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateShippingCost } from "@/lib/shipping";

const schema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const cost = await calculateShippingCost(parsed.data.items);
    return NextResponse.json({ cost: cost.toString() });
  } catch (err) {
    console.error("Error cotizando envío", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo cotizar el envío." },
      { status: 503 }
    );
  }
}
