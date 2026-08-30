import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
