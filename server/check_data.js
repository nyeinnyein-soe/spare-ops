
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const usages = await prisma.usage.findMany({ select: { shopName: true } });
    console.log('Shop Names:', JSON.stringify(usages, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
