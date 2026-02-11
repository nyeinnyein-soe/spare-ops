-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "currentStock" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "stock_logs" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "change" INTEGER NOT NULL,
    "previousStock" INTEGER NOT NULL,
    "newStock" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "referenceId" TEXT,
    "performerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "stock_logs" ADD CONSTRAINT "stock_logs_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_logs" ADD CONSTRAINT "stock_logs_performerId_fkey" FOREIGN KEY ("performerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
