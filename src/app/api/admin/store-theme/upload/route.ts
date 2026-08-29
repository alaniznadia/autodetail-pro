import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { STORE_THEME_ID } from "@/lib/store-theme";
import { saveSiteImage, deleteSiteImageFile, InvalidImageError } from "@/lib/site-images";
import { requireAdmin } from "@/lib/api-auth";

// Los tres campos de imagen "sueltos" de StoreTheme (no el banner, que
// tiene su propio CRUD porque son varios). kind identifica cuál se sube.
const FIELD_BY_KIND = {
  favicon: "faviconUrl",
  logo: "logoUrl",
  about: "aboutImageUrl",
} as const;

type Kind = keyof typeof FIELD_BY_KIND;

function isValidKind(value: unknown): value is Kind {
  return typeof value === "string" && value in FIELD_BY_KIND;
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  const formData = await req.formData();
  const kind = formData.get("kind");
  const file = formData.get("file");

  if (!isValidKind(kind)) {
    return NextResponse.json({ error: "Tipo de imagen inválido." }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Falta el archivo de imagen." }, { status: 400 });
  }

  try {
    const { url } = await saveSiteImage(file, kind);
    const field = FIELD_BY_KIND[kind];
    const theme = await prisma.storeTheme.upsert({
      where: { id: STORE_THEME_ID },
      update: { [field]: url },
      create: { id: STORE_THEME_ID, [field]: url },
    });
    return NextResponse.json({ theme });
  } catch (err) {
    if (err instanceof InvalidImageError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Error subiendo imagen de apariencia", err);
    return NextResponse.json({ error: "No se pudo subir la imagen." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  const kind = req.nextUrl.searchParams.get("kind");
  if (!isValidKind(kind)) {
    return NextResponse.json({ error: "Tipo de imagen inválido." }, { status: 400 });
  }

  const field = FIELD_BY_KIND[kind];
  const current = await prisma.storeTheme.findUnique({ where: { id: STORE_THEME_ID } });
  const currentUrl = current?.[field];
  if (currentUrl) await deleteSiteImageFile(currentUrl);

  const theme = await prisma.storeTheme.upsert({
    where: { id: STORE_THEME_ID },
    update: { [field]: null },
    create: { id: STORE_THEME_ID },
  });

  return NextResponse.json({ theme });
}
