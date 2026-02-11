import { Request, Response } from "express";
import prisma from "../db";
import logger from "../utils/logger";

export const getInventoryItems = async (req: Request, res: Response) => {
  const { role } = (req as any).user;
  const where = role === "sales" ? { isArchived: false } : {};

  try {
    const items = await prisma.inventoryItem.findMany({
      where,
      orderBy: { name: "asc" },
    });
    res.json(items);
  } catch (error) {
    logger.error(`Failed to fetch inventory items: ${error}`);
    res.status(500).json({ error: "Failed to fetch inventory items" });
  }
};

export const createInventoryItem = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const item = await prisma.inventoryItem.create({
      data: { name, description, currentStock: 0 },
    });
    res.status(201).json(item);
  } catch (error) {
    logger.error(`Create failed: ${error}`);
    res.status(400).json({ error: "Item already exists or invalid data" });
  }
};

export const updateInventoryItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    await prisma.inventoryItem.update({
      where: { id },
      data: { name, description },
    });

    res.json({ message: "Updated successfully" });
  } catch (error) {
    logger.error(`Update failed for item ${req.params.id}: ${error}`);
    res.status(500).json({ error: "Update failed" });
  }
};

export const adjustStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, amount, remarks, supplierId } = req.body;
    const { id: performerId } = (req as any).user;

    const result = await prisma.$transaction(async (tx: any) => {
      const item = await tx.inventoryItem.findUnique({ where: { id } });
      if (!item) throw new Error("Item not found");

      let newStock = item.currentStock;
      let change = amount;

      if (action === "STOCK_IN") {
        newStock += amount;
      } else if (action === "STOCK_OUT") {
        newStock -= amount;
        change = -amount;
      } else if (action === "ADJUSTMENT") {
        newStock = amount;
        change = amount - item.currentStock;
      }

      const updatedItem = await tx.inventoryItem.update({
        where: { id },
        data: { currentStock: newStock },
      });

      await tx.stockLog.create({
        data: {
          inventoryItemId: id,
          change,
          previousStock: item.currentStock,
          newStock,
          reason: action,
          remarks,
          performerId,
          supplierId: action === "STOCK_IN" ? supplierId : undefined,
        },
      });

      return updatedItem;
    });

    res.json(result);
  } catch (error: any) {
    logger.error(`Stock adjustment failed: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
};

export const getStockLogs = async (req: Request, res: Response) => {
  try {
    const { itemId, supplierId, startDate, endDate } = req.query;
    const where: any = {};
    if (itemId) where.inventoryItemId = itemId as string;
    if (supplierId) where.supplierId = supplierId as string;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const logs = await prisma.stockLog.findMany({
      where,
      include: {
        inventoryItem: { select: { name: true } },
        performer: { select: { name: true } },
        supplier: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(logs);
  } catch (error) {
    logger.error(`Failed to fetch stock logs: ${error}`);
    res.status(500).json({ error: "Failed to fetch stock logs" });
  }
};

export const toggleArchiveInventoryItem = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const item = await prisma.inventoryItem.findUnique({ where: { id } });

    await prisma.inventoryItem.update({
      where: { id },
      data: { isArchived: !item?.isArchived },
    });
    res.json({ message: "Status changed" });
  } catch (error) {
    res.status(500).json({ error: "Action failed" });
  }
};
