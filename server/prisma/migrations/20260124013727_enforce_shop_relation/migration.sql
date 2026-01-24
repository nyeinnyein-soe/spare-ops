/*
  Warnings:

  - You are about to drop the column `shopName` on the `usages` table. All the data in the column will be lost.
  - Made the column `shopId` on table `usages` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "usages" DROP CONSTRAINT "usages_shopId_fkey";

-- AlterTable
ALTER TABLE "usages" DROP COLUMN "shopName",
ALTER COLUMN "shopId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "usages" ADD CONSTRAINT "usages_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
