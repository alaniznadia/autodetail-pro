import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1).optional(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  // Frena la creación masiva de cuentas (bots, enumeración de emails):
  // 5 intentos cada 15 minutos por IP alcanza para un registro normal
  // (incluido algún reintento por typo) sin abrir la puerta a un script.
  const { allowed, retryAfterMs } = await checkRateLimit(`register:${getClientIp(req)}`, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!allowed) return rateLimitResponse(retryAfterMs);

  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json({ error: "Ya existe una cuenta con ese email." }, { status: 409 });
  }

  // El rol siempre es CUSTOMER acá: los roles ADMIN/EMPLOYEE solo se dan de
  // alta desde el panel de admin (/admin/usuarios), nunca desde este endpoint
  // público.
  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      role: "CUSTOMER",
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
