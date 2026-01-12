import { Request, Response } from "express";
import prisma from "../db";

export const getUsages = async (req: Request, res: Response) => {
  try {
    const usages = await prisma.usage.findMany({
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
    const { shopName, partType, salespersonId, voucherImage } = req.body;
    await prisma.usage.create({
      data: { shopName, partType, salespersonId, voucherImage },
    });
    res.status(201).json({ message: "Usage logged" });
  } catch (error) {
    res.status(500).json({ error: "Failed to log usage" });
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

export const updateUsage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { shopName, partType } = req.body;
    await prisma.usage.update({
      where: { id },
      data: { shopName, partType },
    });
    res.json({ message: "Usage updated" });
  } catch (error) {
    res.status(500).json({ error: "Update failed" });
  }
};
