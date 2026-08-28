import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { seedInitialData } from "@/lib/seed-data";

// Ruta temporal para cargar los datos iniciales (sucursal, admin,
// categorías, productos de ejemplo, tarifas de envío) en una base de
// producción recién migrada, sin acceso directo a la base desde fuera de
// Vercel. Protegida por SEED_SECRET; se borra después de usarse una vez
// (ver README / historial de commits).
//
// Los headers CORS son necesarios porque se llama una sola vez desde un
// archivo HTML local (origen file://, sin conexión TCP directa a la base
// disponible desde donde se ejecuta el agente) — la clave secreta sigue
// siendo la única protección real.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-seed-secret",
};

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-seed-secret");
  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: CORS_HEADERS });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  await seedInitialData(prisma, {
    adminEmail: parsed.data.email,
    adminPassword: parsed.data.password,
  });

  return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
}
