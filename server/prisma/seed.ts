import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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

  console.log({ admin, sales });
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
