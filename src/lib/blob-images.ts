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
 * Sube una imagen a Vercel Blob bajo el prefijo (carpeta) indicado y
 * devuelve la URL pública. Compartido por las imágenes de producto y las
 * de apariencia de la tienda (ícono, logo, banners, "sobre nosotros").
 */
export async function saveImage(file: File, folder: string): Promise<{ url: string }> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new InvalidImageError("La imagen no puede pesar más de 5 MB.");
  }
  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    throw new InvalidImageError("Formato no soportado. Usá JPG, PNG o WEBP.");
  }

  const filename = `${folder}/${crypto.randomUUID()}.${extension}`;

  try {
    const blob = await put(filename, file, {
      access: "public",
      contentType: file.type,
    });
    return { url: blob.url };
  } catch (err) {
    // @vercel/blob puede fallar por varias razones distintas (falta el
    // token, el token es inválido, el store está suspendido, etc.) y cada
    // una tira un mensaje distinto y ya accionable. Mejor mostrar el
    // mensaje real que un genérico que puede llevar a repetir pasos que
    // ya estaban bien.
    if (err instanceof BlobError) {
      throw new InvalidImageError(err.message);
    }
    throw err;
  }
}

/**
 * Borra el archivo de Vercel Blob. No falla si la URL no es de Blob.
 */
export async function deleteImageFile(url: string): Promise<void> {
  if (!url.includes(".public.blob.vercel-storage.com")) return;

  try {
    await del(url);
  } catch (err) {
    console.error("Error borrando imagen de Vercel Blob", err);
  }
}
