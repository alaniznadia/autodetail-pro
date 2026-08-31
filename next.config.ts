import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Las imágenes de producto/apariencia se suben a Vercel Blob (ver
    // lib/blob-images.ts), que le asigna a cada store un subdominio al
    // azar bajo este mismo dominio — por eso el wildcard en vez de un
    // hostname fijo.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
