import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

export async function seedInitialData(
  prisma: PrismaClient,
  { adminEmail, adminPassword }: { adminEmail: string; adminPassword: string }
) {
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
        { sku: "SH-PHN-500", name: "500 ml", price: "6500.00", weightGr: 550 },
        { sku: "SH-PHN-1000", name: "1 L", price: "11500.00", weightGr: 1050 },
      ],
    },
    {
      name: "Cera en Pasta Carnauba",
      slug: "cera-pasta-carnauba",
      description: "Cera natural de alto brillo y protección duradera.",
      brand: "Epic Shine",
      categoryId: ceras.id,
      variants: [{ sku: "CE-CAR-200", name: "200 g", price: "15900.00", weightGr: 250 }],
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
          weightGr: v.weightGr,
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

  const defaultShippingRates = [
    { name: "Hasta 1kg", maxWeightGr: 1000, cost: "3500.00" },
    { name: "1 a 3kg", maxWeightGr: 3000, cost: "5000.00" },
    { name: "3 a 5kg", maxWeightGr: 5000, cost: "7000.00" },
    { name: "Más de 5kg", maxWeightGr: 15000, cost: "9500.00" },
  ];
  for (const rate of defaultShippingRates) {
    const existing = await prisma.shippingRate.findFirst({ where: { name: rate.name } });
    if (!existing) {
      await prisma.shippingRate.create({ data: rate });
    }
  }
}
