import { PrismaClient } from "@prisma/client";
import { seedInitialData } from "../src/lib/seed-data";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@epicshine.com.ar";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "CambiarEstaClave123!";

  await seedInitialData(prisma, { adminEmail, adminPassword });

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
