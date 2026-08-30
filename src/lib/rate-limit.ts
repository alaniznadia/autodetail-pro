import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Limitador de ventana fija respaldado en la misma Postgres (no hay
 * Redis/KV en este proyecto, y agregar uno solo para esto sería más
 * infraestructura que la tienda necesita). Un solo UPSERT atómico decide
 * si la ventana sigue vigente (suma 1) o ya venció (arranca de nuevo en 1),
 * así que no hay carrera entre lecturas y escrituras concurrentes.
 */
export async function checkRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - windowMs);

  const rows = await prisma.$queryRaw<{ count: number; windowStart: Date }[]>`
    INSERT INTO "RateLimit" (key, "windowStart", count)
    VALUES (${key}, ${now}, 1)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN "RateLimit"."windowStart" < ${cutoff} THEN 1 ELSE "RateLimit".count + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" < ${cutoff} THEN ${now} ELSE "RateLimit"."windowStart" END
    RETURNING count, "windowStart"
  `;

  const row = rows[0];
  const allowed = row.count <= limit;
  const retryAfterMs = allowed ? 0 : row.windowStart.getTime() + windowMs - now.getTime();
  return { allowed, retryAfterMs };
}

export function rateLimitResponse(retryAfterMs: number) {
  return NextResponse.json(
    { error: "Demasiados intentos. Probá de nuevo en unos minutos." },
    { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
  );
}

// Vercel (y cualquier proxy delante de Next.js) pasa la IP real del
// cliente en x-forwarded-for; sin proxy de por medio (dev local) no viene,
// así que todo cae bajo la misma clave "unknown" en vez de romper.
export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
