import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveSiteImage, InvalidImageError } from "@/lib/site-images";
import { requireAdmin } from "@/lib/api-auth";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const banners = await prisma.storeBanner.findMany({ orderBy: { position: "asc" } });
  return NextResponse.json({ banners });
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  const formData = await req.formData();
  const file = formData.get("file");
  const altText = formData.get("altText");
  const linkUrl = formData.get("linkUrl");

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
    const { url } = await saveSiteImage(file, "banner");

    const lastBanner = await prisma.storeBanner.findFirst({ orderBy: { position: "desc" } });

    const banner = await prisma.storeBanner.create({
      data: {
        imageUrl: url,
        altText: altText.trim(),
        linkUrl: typeof linkUrl === "string" && linkUrl.trim() ? linkUrl.trim() : null,
        position: (lastBanner?.position ?? -1) + 1,
      },
    });

    return NextResponse.json({ banner }, { status: 201 });
  } catch (err) {
    if (err instanceof InvalidImageError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Error subiendo banner de la tienda", err);
    return NextResponse.json({ error: "No se pudo subir la imagen." }, { status: 500 });
  }
}
