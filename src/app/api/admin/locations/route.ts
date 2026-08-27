import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createLocationSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
});

export async function GET() {
  const locations = await prisma.location.findMany({
    orderBy: [{ isMain: "desc" }, { name: "asc" }],
  });
  return NextResponse.json({ locations });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createLocationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const isFirstLocation = (await prisma.location.count()) === 0;

  const location = await prisma.location.create({
    data: {
      name: parsed.data.name,
      address: parsed.data.address || undefined,
      // La primera sucursal que se crea queda como principal por defecto,
      // para no dejar la tienda sin ninguna (el resto del sistema asume
      // que siempre hay una).
      isMain: isFirstLocation,
    },
  });

  return NextResponse.json({ location }, { status: 201 });
}
