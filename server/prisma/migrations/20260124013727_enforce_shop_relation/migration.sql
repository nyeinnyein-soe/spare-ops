/*
  Warnings:

  - You are about to drop the column `shopName` on the `usages` table. All the data in the column will be lost.
  - Made the column `shopId` on table `usages` required. This step will fail if there are existing NULL values in that column.

*/
-- Backfill Script
DO $$
DECLARE
    legacy_merchant_id TEXT;
    r RECORD;
    new_shop_id TEXT;
    legacy_shop_code TEXT;
BEGIN
    -- 1. Ensure Legacy Merchant
    SELECT id INTO legacy_merchant_id FROM "merchants" WHERE code = 'LEGACY_M';
    
    IF legacy_merchant_id IS NULL THEN
        legacy_merchant_id := gen_random_uuid();
        INSERT INTO "merchants" (id, code, name, "createdAt", "updatedAt")
        VALUES (legacy_merchant_id, 'LEGACY_M', 'Legacy Merchant', NOW(), NOW());
    END IF;

    -- 2. Process Usages
    FOR r IN SELECT id, "shopName" FROM "usages" WHERE "shopName" IS NOT NULL AND "shopId" IS NULL LOOP
        
        -- Generate legacy code safely
        legacy_shop_code := SUBSTRING('LEGACY_S_' || UPPER(REGEXP_REPLACE(r."shopName", '\s+', '_', 'g')), 1, 20);
        
        -- Find or Create Shop
        SELECT id INTO new_shop_id FROM "shops" WHERE code = legacy_shop_code;
        
        IF new_shop_id IS NULL THEN
            new_shop_id := gen_random_uuid();
            INSERT INTO "shops" (id, code, name, "merchantId", "createdAt", "updatedAt")
            VALUES (new_shop_id, legacy_shop_code, r."shopName", legacy_merchant_id, NOW(), NOW());
        END IF;

        -- Update Usage
        UPDATE "usages" SET "shopId" = new_shop_id WHERE id = r.id;
        
    END LOOP;
END $$;


-- DropForeignKey
ALTER TABLE "usages" DROP CONSTRAINT "usages_shopId_fkey";

-- AlterTable
ALTER TABLE "usages" DROP COLUMN "shopName",
ALTER COLUMN "shopId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "usages" ADD CONSTRAINT "usages_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
