import { put, del, BlobError } from "@vercel/blob";
import crypto from "node:crypto";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export class InvalidImageError extends Error {}

/**
 * Sube una imagen de producto a Vercel Blob y devuelve la URL pública
 * para guardar en ProductImage.url. Antes esto escribía a
 * public/uploads/products en disco local — funcionaba en desarrollo pero
 * no en Vercel (el filesystem de las funciones serverless es de solo
 * lectura, salvo /tmp que no persiste entre requests), confirmado en
 * producción real.
 */
export async function saveProductImage(file: File): Promise<{ url: string }> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new InvalidImageError("La imagen no puede pesar más de 5 MB.");
  }
  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    throw new InvalidImageError("Formato no soportado. Usá JPG, PNG o WEBP.");
  }

  const filename = `products/${crypto.randomUUID()}.${extension}`;

  try {
    const blob = await put(filename, file, {
      access: "public",
      contentType: file.type,
    });
    return { url: blob.url };
  } catch (err) {
    // La causa más común en producción es que todavía no se conectó el
    // storage: sin esto, @vercel/blob tira un error genérico ("Vercel
    // Blob: No read-write token found...") que en el admin se veía como
    // "No se pudo subir la imagen" sin explicar por qué. Lo traducimos a
    // un mensaje accionable en vez de un 500 opaco.
    if (err instanceof BlobError) {
      throw new InvalidImageError(
        "No se pudo subir la imagen porque el almacenamiento no está conectado. " +
          "En Vercel: Storage → Create Database → Blob, conectalo al proyecto y " +
          "hacé un redeploy (Deployments → el commit más reciente → Redeploy)."
      );
    }
    throw err;
  }
}

/**
 * Borra el archivo de Vercel Blob. No falla si la URL no es de Blob (por
 * ejemplo, una imagen vieja subida al disco local antes de este cambio).
 */
export async function deleteProductImageFile(url: string): Promise<void> {
  if (!url.includes(".public.blob.vercel-storage.com")) return;

  try {
    await del(url);
  } catch (err) {
    console.error("Error borrando imagen de Vercel Blob", err);
  }
}
