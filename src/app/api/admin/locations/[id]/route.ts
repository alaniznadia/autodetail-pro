import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateLocationSchema = z.object({
  active: z.boolean().optional(),
  makeMain: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const parsed = updateLocationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const location = await prisma.location.findUnique({ where: { id } });
  if (!location) {
    return NextResponse.json({ error: "Sucursal no encontrada" }, { status: 404 });
  }

  if (parsed.data.makeMain) {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.location.updateMany({ where: { isMain: true }, data: { isMain: false } });
      return tx.location.update({
        where: { id },
        // Una sucursal principal tiene que estar activa: si estaba
        // desactivada, se reactiva al marcarla como principal.
        data: { isMain: true, active: true },
      });
    });
    return NextResponse.json({ location: updated });
  }

  if (parsed.data.active === false && location.isMain) {
    return NextResponse.json(
      { error: "No podés desactivar la sucursal principal. Marcá otra como principal primero." },
      { status: 409 }
    );
  }

  const updated = await prisma.location.update({
    where: { id },
    data: { active: parsed.data.active },
  });

  return NextResponse.json({ location: updated });
}
