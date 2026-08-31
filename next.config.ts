import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (vía pdfjs-dist) carga su "worker" como un archivo aparte en
  // tiempo de ejecución; si Turbopack/webpack lo empaqueta junto con el
  // resto del bundle del server, no lo encuentra. Dejándolo afuera del
  // bundle, Node lo resuelve directo desde node_modules como corresponde.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  images: {
    // Las imágenes de producto/apariencia subidas se guardan en Vercel Blob
    // (ver src/lib/blob-images.ts); sin este allowlist, next/image bloquea
    // la optimización de esas URLs externas y la imagen no se ve.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
