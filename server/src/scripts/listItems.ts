import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
    const items = await prisma.inventoryItem.findMany({ select: { name: true } });
    console.log(items.map(i => i.name));
    process.exit(0);
}
main();
