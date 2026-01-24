
import { Request, Response } from "express";
import prisma from "../db";

export const getShops = async (req: Request, res: Response) => {
    try {
        const shops = await prisma.shop.findMany({
            include: { merchant: true },
            orderBy: { name: "asc" },
        });
        res.json(shops);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch shops" });
    }
};

export const createShop = async (req: Request, res: Response) => {
    try {
        const { code, name, merchantId } = req.body;
        const shop = await prisma.shop.create({
            data: { code, name, merchantId },
        });
        res.status(201).json(shop);
    } catch (error) {
        res.status(400).json({ error: "Shop already exists or invalid data" });
    }
};

export const updateShop = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { code, name, merchantId } = req.body;
        await prisma.shop.update({
            where: { id },
            data: { code, name, merchantId },
        });
        res.json({ message: "Shop updated" });
    } catch (error) {
        res.status(500).json({ error: "Update failed" });
    }
};

export const deleteShop = async (req: Request, res: Response) => {
    try {
        await prisma.shop.delete({ where: { id: req.params.id } });
        res.json({ message: "Shop deleted" });
    } catch (error) {
        res.status(500).json({ error: "Delete failed" });
    }
};
