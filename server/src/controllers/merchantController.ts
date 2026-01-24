
import { Request, Response } from "express";
import prisma from "../db";

export const getMerchants = async (req: Request, res: Response) => {
    try {
        const merchants = await prisma.merchant.findMany({
            include: { shops: true },
            orderBy: { name: "asc" },
        });
        res.json(merchants);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch merchants" });
    }
};

export const createMerchant = async (req: Request, res: Response) => {
    try {
        const { code, name } = req.body;
        const merchant = await prisma.merchant.create({
            data: { code, name },
        });
        res.status(201).json(merchant);
    } catch (error) {
        res.status(400).json({ error: "Merchant already exists or invalid data" });
    }
};

export const updateMerchant = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { code, name } = req.body;
        await prisma.merchant.update({
            where: { id },
            data: { code, name },
        });
        res.json({ message: "Merchant updated" });
    } catch (error) {
        res.status(500).json({ error: "Update failed" });
    }
};

export const deleteMerchant = async (req: Request, res: Response) => {
    try {
        await prisma.merchant.delete({ where: { id: req.params.id } });
        res.json({ message: "Merchant deleted" });
    } catch (error) {
        res.status(500).json({ error: "Delete failed" });
    }
};
