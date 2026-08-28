import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/pos", "/api", "/mi-cuenta", "/checkout", "/carrito", "/pedido"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
