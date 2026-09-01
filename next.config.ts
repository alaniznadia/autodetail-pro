import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (vía pdfjs-dist) carga su "worker" como un archivo aparte en
  // tiempo de ejecución; si Turbopack/webpack lo empaqueta junto con el
  // resto del bundle del server, no lo encuentra. Dejándolo afuera del
  // bundle, Node lo resuelve directo desde node_modules como corresponde.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  // Al quedar afuera del bundle, el output file tracing de Next (que arma
  // qué archivos de node_modules van al deploy) puede no detectar todos
  // los archivos de pdf-parse/pdfjs-dist que se requieren en runtime
  // (el worker, entre otros) y romper en producción aunque funcione local
  // con el node_modules completo. Los incluimos a mano para las rutas que
  // los usan.
  outputFileTracingIncludes: {
    "/api/admin/products/bulk": ["./node_modules/pdf-parse/**/*", "./node_modules/pdfjs-dist/**/*"],
    "/api/admin/products/bulk/template": [
      "./node_modules/pdf-parse/**/*",
      "./node_modules/pdfjs-dist/**/*",
    ],
  },
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
