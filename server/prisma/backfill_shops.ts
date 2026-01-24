
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting backfill...');

    // 1. Find all usages with shopName but no shopId
    const usagesToBackfill = await prisma.usage.findMany({
        where: {
            shopId: null,
            shopName: { not: null },
        },
    });

    if (usagesToBackfill.length === 0) {
        console.log('No usages to backfill.');
        return;
    }

    console.log(`Found ${usagesToBackfill.length} usages to backfill.`);

    // 2. Create Legacy Merchant
    const legacyMerchant = await prisma.merchant.upsert({
        where: { code: 'LEGACY_M' },
        update: {},
        create: {
            code: 'LEGACY_M',
            name: 'Legacy Merchant',
        },
    });

    // 3. Process each usage
    const shopCache = new Map<string, string>(); // shopName -> shopId

    for (const usage of usagesToBackfill) {
        if (!usage.shopName) continue;

        const shopName = usage.shopName;
        let shopId = shopCache.get(shopName);

        if (!shopId) {
            // Find or create Shop
            // Use a sanitized code derived from name or generic legacy code
            const legacyShopCode = `LEGACY_S_${shopName.replace(/\s+/g, '_').toUpperCase()}`.substring(0, 20); // Truncate to be safe

            const shop = await prisma.shop.upsert({
                where: { code: legacyShopCode },
                update: {},
                create: {
                    code: legacyShopCode,
                    name: shopName,
                    merchantId: legacyMerchant.id,
                },
            });
            shopId = shop.id;
            shopCache.set(shopName, shopId);
        }

        // Update usage with new shopId
        await prisma.usage.update({
            where: { id: usage.id },
            data: { shopId },
        });
    }

    console.log('Backfill complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
