import { saveImage, deleteImageFile, InvalidImageError, MAX_IMAGE_BYTES } from "@/lib/blob-images";

export { InvalidImageError, MAX_IMAGE_BYTES };

/**
 * Sube una imagen de producto a Vercel Blob y devuelve la URL pública
 * para guardar en ProductImage.url. Antes esto escribía a
 * public/uploads/products en disco local — funcionaba en desarrollo pero
 * no en Vercel (el filesystem de las funciones serverless es de solo
 * lectura, salvo /tmp que no persiste entre requests), confirmado en
 * producción real.
 */
export function saveProductImage(file: File): Promise<{ url: string }> {
  return saveImage(file, "products");
}

/**
 * Borra el archivo de Vercel Blob. No falla si la URL no es de Blob (por
 * ejemplo, una imagen vieja subida al disco local antes de este cambio).
 */
export function deleteProductImageFile(url: string): Promise<void> {
  return deleteImageFile(url);
}
