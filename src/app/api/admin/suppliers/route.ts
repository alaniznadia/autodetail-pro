import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

const schema = z.object({
  name: z.string().min(1),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const suppliers = await prisma.supplier.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ suppliers });
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supplier = await prisma.supplier.create({
    data: {
      name: parsed.data.name,
      contactName: parsed.data.contactName,
      phone: parsed.data.phone,
      email: parsed.data.email || undefined,
      notes: parsed.data.notes,
    },
  });

  return NextResponse.json({ supplier }, { status: 201 });
}
