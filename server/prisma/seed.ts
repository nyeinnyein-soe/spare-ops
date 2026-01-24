import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const INITIAL_PARTS = [
  "Remax Charger",
  "Charging Cable",
  "Micro Cable",
  "Battery",
];

async function main() {
  // 1. Hash passwords
  const adminPassword = await bcrypt.hash("admin", 10);
  const salesPassword = await bcrypt.hash("sales", 10);

  // 2. Upsert Admin User (Create if not exists)
  const admin = await prisma.user.create({
    data: {
      name: "Admin",
      role: "admin",
      password: adminPassword,
      avatarColor: "bg-indigo-600",
    },
  });

  // 3. Upsert Sales User
  const sales = await prisma.user.create({
    data: {
      name: "Kyaw Kyaw",
      role: "sales",
      password: salesPassword,
      avatarColor: "bg-emerald-600",
    },
  });

  for (const partName of INITIAL_PARTS) {
    await prisma.inventoryItem.upsert({
      where: { name: partName },
      update: {},
      create: { name: partName },
    });
  }

  console.log({ admin, sales });

  // 4. Seed ASTI Enterprise
  const astiMerchant = await prisma.merchant.upsert({
    where: { code: "000100000000002" },
    update: {},
    create: {
      code: "000100000000002",
      name: "ASTI Enterprise",
    },
  });

  const astiShops = [
    { code: "000000000020001", name: "ASTI Ent" },
    // Add more if needed, referencing valid codes
  ];

  for (const shop of astiShops) {
    await prisma.shop.upsert({
      where: { code: shop.code },
      update: {},
      create: {
        code: shop.code,
        name: shop.name,
        merchantId: astiMerchant.id,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
