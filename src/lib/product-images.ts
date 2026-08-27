import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "products");
const PUBLIC_PATH_PREFIX = "/uploads/products";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export class InvalidImageError extends Error {}

/**
 * Guarda una imagen de producto en disco local (public/uploads/products) y
 * devuelve la URL pública para guardar en ProductImage.url.
 *
 * ⚠️ Esto funciona perfecto en local o en un servidor propio con disco
 * persistente, pero NO sirve en Vercel: el filesystem de las funciones
 * serverless es de solo lectura (salvo /tmp, que no persiste entre
 * requests). Para producción en Vercel hay que reemplazar esta función
 * por una subida a Supabase Storage o Cloudinary — el resto del código
 * (la API route y el formulario del admin) no cambia, solo esta función.
 */
export async function saveProductImage(file: File): Promise<{ url: string }> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new InvalidImageError("La imagen no puede pesar más de 5 MB.");
  }
  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    throw new InvalidImageError("Formato no soportado. Usá JPG, PNG o WEBP.");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const filename = `${crypto.randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);

  return { url: `${PUBLIC_PATH_PREFIX}/${filename}` };
}

/**
 * Borra el archivo del disco. No falla si el archivo ya no existe (por
 * ejemplo si se subió con un proveedor cloud distinto en el pasado).
 */
export async function deleteProductImageFile(url: string): Promise<void> {
  if (!url.startsWith(PUBLIC_PATH_PREFIX)) return; // URL externa (ya migrado a cloud), no hay archivo local que borrar
  const filename = url.slice(PUBLIC_PATH_PREFIX.length + 1);
  if (!filename || filename.includes("/") || filename.includes("..")) return;

  try {
    await unlink(path.join(UPLOAD_DIR, filename));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}
