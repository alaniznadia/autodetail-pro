import { put, BlobError } from "@vercel/blob";
import crypto from "node:crypto";

export const MAX_REMITO_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export class InvalidRemitoFileError extends Error {}

export type RemitoSourceType = "REMITO_PDF" | "TICKET_PHOTO";

export function remitoSourceType(mimeType: string): RemitoSourceType {
  return mimeType === "application/pdf" ? "REMITO_PDF" : "TICKET_PHOTO";
}

/**
 * Valida y sube el remito/ticket original a Vercel Blob, para poder
 * volver a mirarlo después desde la compra que generó. Devuelve también
 * los bytes ya leídos (se reusan para mandarlos a la IA sin leer el
 * archivo dos veces).
 */
export async function saveRemitoFile(
  file: File
): Promise<{ url: string; bytes: Buffer; mimeType: string }> {
  if (file.size > MAX_REMITO_BYTES) {
    throw new InvalidRemitoFileError("El archivo no puede pesar más de 10 MB.");
  }
  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    throw new InvalidRemitoFileError("Formato no soportado. Usá PDF, JPG, PNG o WEBP.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = `remitos/${crypto.randomUUID()}.${extension}`;

  try {
    const blob = await put(filename, bytes, {
      access: "public",
      contentType: file.type,
    });
    return { url: blob.url, bytes, mimeType: file.type };
  } catch (err) {
    if (err instanceof BlobError) {
      throw new InvalidRemitoFileError(err.message);
    }
    throw err;
  }
}
