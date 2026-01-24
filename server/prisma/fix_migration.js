
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Attempting to delete failed migration record...');
    try {
        const count = await prisma.$executeRaw`DELETE FROM "_prisma_migrations" WHERE migration_name = '20260124013727_enforce_shop_relation'`;
        console.log(`Deleted ${count} records.`);
    } catch (e) {
        console.error('Error deleting record:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
