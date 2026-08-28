import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site-url";

const STATIC_ROUTES = ["", "/catalogo", "/sobre-nosotros", "/terminos", "/privacidad", "/devoluciones"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await prisma.product.findMany({
    where: { active: true },
    select: { slug: true, updatedAt: true },
  });

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: path === "" || path === "/catalogo" ? "daily" : "yearly",
    priority: path === "" ? 1 : path === "/catalogo" ? 0.8 : 0.3,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/producto/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticEntries, ...productEntries];
}
