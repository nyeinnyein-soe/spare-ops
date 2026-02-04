import { Request, Response } from "express";
import prisma from "../db";

export const getUsages = async (req: Request, res: Response) => {
  try {
    const usages = await prisma.usage.findMany({
      include: { inventoryItem: true, shop: true },
      orderBy: { usedAt: "desc" },
    });

    const enrichedUsages = await Promise.all(
      usages.map(async (u) => {
        const user = await prisma.user.findUnique({
          where: { id: u.salespersonId },
        });
        return {
          ...u,
          salespersonName: user?.name || "Unknown",
          partType: u.inventoryItem.name,
          inventoryItemId: u.inventoryItemId,
          shopName: u.shop?.name || "Unknown Shop", // Map Shop relation to display name
          shopId: u.shopId,
          remarks: u.remarks,
          usedAt: u.usedAt.getTime(),
        };
      }),
    );

    res.json(enrichedUsages);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch usages" });
  }
};

export const createUsage = async (req: Request, res: Response) => {
  try {
    const { shopId, inventoryItemId, salespersonId, voucherImage, remarks } = req.body;
    await prisma.usage.create({
      data: { shopId, inventoryItemId, salespersonId, voucherImage, remarks },
    });
    res.status(201).json({ message: "Usage logged" });
  } catch (error) {
    res.status(500).json({ error: "Failed to log usage" });
  }
};

export const updateUsage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { shopId, inventoryItemId } = req.body;
    await prisma.usage.update({
      where: { id },
      data: { shopId, inventoryItemId },
    });
    res.json({ message: "Usage updated" });
  } catch (error) {
    res.status(500).json({ error: "Update failed" });
  }
};

export const deleteUsage = async (req: Request, res: Response) => {
  try {
    await prisma.usage.delete({ where: { id: req.params.id } });
    res.json({ message: "Usage deleted" });
  } catch (error) {
    res.status(500).json({ error: "Delete failed" });
  }
};
