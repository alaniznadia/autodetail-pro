import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { previewCoupon, InvalidCouponError } from "@/lib/coupons";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const schema = z.object({
  code: z.string().min(1),
  subtotal: z.number().nonnegative(),
});

export async function POST(req: NextRequest) {
  // Sin esto, cualquiera podía probar códigos de cupón por fuerza bruta:
  // es público, sin sesión, y la respuesta distingue "inválido" de
  // "válido + descuento". Holgado a propósito (un cliente real puede
  // tipear mal un código un par de veces).
  const { allowed, retryAfterMs } = await checkRateLimit(`coupon-validate:${getClientIp(req)}`, {
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });
  if (!allowed) return rateLimitResponse(retryAfterMs);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { discountTotal } = await previewCoupon(
      parsed.data.code,
      new Prisma.Decimal(parsed.data.subtotal)
    );
    return NextResponse.json({ discountTotal: discountTotal.toString() });
  } catch (err) {
    if (err instanceof InvalidCouponError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Error validando cupón", err);
    return NextResponse.json({ error: "No se pudo validar el cupón." }, { status: 500 });
  }
}
