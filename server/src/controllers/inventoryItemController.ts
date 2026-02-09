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
      data: { name, description },
    });
    res.status(201).json(item);
  } catch (error) {
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
