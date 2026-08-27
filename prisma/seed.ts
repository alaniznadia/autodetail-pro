import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const location = await prisma.location.upsert({
    where: { id: "main-location" },
    update: {},
    create: {
      id: "main-location",
      name: "Local Epic Shine",
      isMain: true,
      address: "Sucursal principal",
    },
  });

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@epicshine.com.ar";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "CambiarEstaClave123!";
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Admin Epic Shine",
      role: "ADMIN",
      passwordHash: await bcrypt.hash(adminPassword, 10),
    },
  });

  const categories = [
    { name: "Shampoo", slug: "shampoo" },
    { name: "Ceras", slug: "ceras" },
    { name: "Pulidos", slug: "pulidos" },
    { name: "Microfibras", slug: "microfibras" },
    { name: "Kits", slug: "kits" },
    { name: "Accesorios", slug: "accesorios" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  const shampoo = await prisma.category.findUniqueOrThrow({ where: { slug: "shampoo" } });
  const ceras = await prisma.category.findUniqueOrThrow({ where: { slug: "ceras" } });

  const sampleProducts = [
    {
      name: "Shampoo pH Neutro",
      slug: "shampoo-ph-neutro",
      description: "Shampoo de alta lubricidad, seguro para todo tipo de pintura.",
      brand: "Epic Shine",
      categoryId: shampoo.id,
      variants: [
        { sku: "SH-PHN-500", name: "500 ml", price: "6500.00" },
        { sku: "SH-PHN-1000", name: "1 L", price: "11500.00" },
      ],
    },
    {
      name: "Cera en Pasta Carnauba",
      slug: "cera-pasta-carnauba",
      description: "Cera natural de alto brillo y protección duradera.",
      brand: "Epic Shine",
      categoryId: ceras.id,
      variants: [{ sku: "CE-CAR-200", name: "200 g", price: "15900.00" }],
    },
  ];

  for (const p of sampleProducts) {
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        brand: p.brand,
        categoryId: p.categoryId,
      },
    });

    for (const v of p.variants) {
      const variant = await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: {},
        create: {
          productId: product.id,
          sku: v.sku,
          name: v.name,
          price: v.price,
        },
      });

      await prisma.stockItem.upsert({
        where: { variantId_locationId: { variantId: variant.id, locationId: location.id } },
        update: {},
        create: {
          variantId: variant.id,
          locationId: location.id,
          quantity: 25,
          lowStockAlert: 5,
        },
      });
    }
  }

  console.log("Seed completado.");
  console.log(`Usuario admin: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
