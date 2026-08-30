import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

const schema = z.object({
  street: z.string().min(1),
  number: z.string().min(1),
  floorApt: z.string().optional(),
  city: z.string().min(1),
  province: z.string().min(1),
  postalCode: z.string().min(1),
});

// La dirección de envío ya no se pide en el checkout (se coordina por
// WhatsApp después de pagar), así que un admin la carga acá una vez que el
// cliente la pasa. Crea o actualiza la Address del pedido según corresponda.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  const address = order.addressId
    ? await prisma.address.update({ where: { id: order.addressId }, data: parsed.data })
    : await prisma.address.create({
        data: {
          ...parsed.data,
          phone: order.guestPhone,
          userId: order.customerId,
        },
      });

  if (!order.addressId) {
    await prisma.order.update({ where: { id }, data: { addressId: address.id } });
  }

  return NextResponse.json({ address });
}
