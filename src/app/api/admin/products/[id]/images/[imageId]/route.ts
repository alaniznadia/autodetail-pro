import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteProductImageFile } from "@/lib/product-images";
import { requireAdmin } from "@/lib/api-auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id: productId, imageId } = await params;

  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image || image.productId !== productId) {
    return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
  }

  await prisma.productImage.delete({ where: { id: imageId } });
  await deleteProductImageFile(image.url);

  return NextResponse.json({ ok: true });
}
