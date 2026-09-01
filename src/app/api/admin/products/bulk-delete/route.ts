import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(1000),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Falta la lista de productos a borrar." }, { status: 400 });
  }
  const { ids } = parsed.data;

  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
  const nameById = new Map(products.map((p) => [p.id, p.name]));

  let deleted = 0;
  const failed: { id: string; name: string; error: string }[] = [];

  for (const id of ids) {
    try {
      await prisma.product.delete({ where: { id } });
      deleted++;
    } catch (err: unknown) {
      const name = nameById.get(id) ?? id;
      const code = err instanceof Error && "code" in err ? (err as { code?: string }).code : undefined;
      const message =
        code === "P2025"
          ? "Ya no existe."
          : code === "P2003"
            ? "Tiene ventas o compras asociadas."
            : "No se pudo borrar.";
      if (code !== "P2025") console.error(`Error borrando producto "${name}" (${id}) en borrado masivo`, err);
      failed.push({ id, name, error: message });
    }
  }

  return NextResponse.json({ deleted, failed });
}
