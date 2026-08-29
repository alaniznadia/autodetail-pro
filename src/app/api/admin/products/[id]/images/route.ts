import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveProductImage, InvalidImageError } from "@/lib/product-images";
import { requireAdmin } from "@/lib/api-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id: productId } = await params;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const altText = formData.get("altText");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Falta el archivo de imagen." }, { status: 400 });
  }
  if (typeof altText !== "string" || altText.trim().length === 0) {
    return NextResponse.json(
      { error: "El texto alternativo es obligatorio (accesibilidad)." },
      { status: 400 }
    );
  }

  try {
    const { url } = await saveProductImage(file);

    const lastImage = await prisma.productImage.findFirst({
      where: { productId },
      orderBy: { position: "desc" },
    });

    const image = await prisma.productImage.create({
      data: {
        productId,
        url,
        altText: altText.trim(),
        position: (lastImage?.position ?? -1) + 1,
      },
    });

    return NextResponse.json({ image }, { status: 201 });
  } catch (err) {
    if (err instanceof InvalidImageError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Error subiendo imagen de producto", err);
    return NextResponse.json({ error: "No se pudo subir la imagen." }, { status: 500 });
  }
}
