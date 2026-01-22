/*
  Warnings:

  - Added the required column `inventoryItemId` to the `request_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inventoryItemId` to the `usages` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "request_items" DROP COLUMN "type";
ALTER TABLE "request_items" ADD COLUMN     "inventoryItemId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "usages" ADD COLUMN     "inventoryItemId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_name_key" ON "inventory_items"("name");

-- AddForeignKey
ALTER TABLE "request_items" ADD CONSTRAINT "request_items_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usages" ADD CONSTRAINT "usages_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
