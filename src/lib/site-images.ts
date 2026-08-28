import { saveImage, deleteImageFile } from "@/lib/blob-images";

export { InvalidImageError, MAX_IMAGE_BYTES } from "@/lib/blob-images";

export type SiteImageKind = "favicon" | "logo" | "banner" | "about";

/**
 * Sube una imagen de apariencia de la tienda (ícono, logo, banner de home
 * o imagen de "sobre nosotros") a Vercel Blob, separada por carpeta según
 * el tipo para que sea fácil identificarlas en el storage.
 */
export function saveSiteImage(file: File, kind: SiteImageKind): Promise<{ url: string }> {
  return saveImage(file, `site/${kind}`);
}

export const deleteSiteImageFile = deleteImageFile;
