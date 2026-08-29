import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

const updateUserSchema = z.object({
  role: z.enum(["ADMIN", "EMPLOYEE"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (id === session?.user?.id && parsed.data.active === false) {
    return NextResponse.json(
      { error: "No podés desactivar tu propio usuario." },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      role: parsed.data.role,
      active: parsed.data.active,
      passwordHash: parsed.data.password
        ? await bcrypt.hash(parsed.data.password, 10)
        : undefined,
    },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });

  return NextResponse.json({ user });
}
