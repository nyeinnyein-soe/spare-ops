
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

export const bulkImportMerchants = async (req: Request, res: Response) => {
    try {
        const items = req.body as {
            merchantCode: string;
            merchantName: string;
            shopCode: string;
            shopName: string;
        }[];

        if (!Array.isArray(items)) {
            return res.status(400).json({ error: "Invalid data format" });
        }

        // Perform everything in a single transaction
        await prisma.$transaction(async (tx) => {
            // 1. Group unique merchants
            const merchantMap = new Map<string, string>(); // code -> name
            items.forEach(item => {
                merchantMap.set(item.merchantCode, item.merchantName);
            });

            // 2. Upsert Merchants
            const merchantEntries = Array.from(merchantMap.entries());
            for (const [code, name] of merchantEntries) {
                await tx.merchant.upsert({
                    where: { code },
                    update: { name },
                    create: { code, name },
                });
            }

            // 3. Get all relevant merchants to map IDs (using tx for consistency)
            const allMerchants = await tx.merchant.findMany();
            const merchantIdMap = new Map(allMerchants.map(m => [m.code, m.id]));

            // 4. Upsert Shops
            const shopMap = new Map<string, { name: string; merchantId: string }>();
            items.forEach(item => {
                const merchantId = merchantIdMap.get(item.merchantCode);
                if (merchantId) {
                    shopMap.set(item.shopCode, { name: item.shopName, merchantId });
                }
            });

            const shopEntries = Array.from(shopMap.entries());
            for (const [code, data] of shopEntries) {
                await tx.shop.upsert({
                    where: { code },
                    update: { name: data.name, merchantId: data.merchantId },
                    create: { code, name: data.name, merchantId: data.merchantId },
                });
            }
        });

        res.json({ message: "Bulk import successful", count: items.length });
    } catch (error) {
        console.error("Bulk import transaction failed:", error);
        res.status(500).json({ error: "Bulk import failed. No data was changed." });
    }
};


