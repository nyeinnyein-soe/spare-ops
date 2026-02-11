import { Request, Response } from "express";
import prisma from "../db";
import logger from "../utils/logger";

export const getSuppliers = async (req: Request, res: Response) => {
    try {
        const suppliers = await prisma.supplier.findMany({
            orderBy: { name: "asc" },
        });
        res.json(suppliers);
    } catch (error) {
        logger.error(`Failed to fetch suppliers: ${error}`);
        res.status(500).json({ error: "Failed to fetch suppliers" });
    }
};

export const getSupplierById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const supplier = await prisma.supplier.findUnique({
            where: { id },
        });
        if (!supplier) {
            return res.status(404).json({ error: "Supplier not found" });
        }
        res.json(supplier);
    } catch (error) {
        logger.error(`Failed to fetch supplier ${req.params.id}: ${error}`);
        res.status(500).json({ error: "Failed to fetch supplier" });
    }
};

export const createSupplier = async (req: Request, res: Response) => {
    try {
        const { name, contact, address } = req.body;
        const supplier = await prisma.supplier.create({
            data: { name, contact, address },
        });
        res.status(201).json(supplier);
    } catch (error) {
        logger.error(`Failed to create supplier: ${error}`);
        res.status(400).json({ error: "Supplier already exists or invalid data" });
    }
};

export const updateSupplier = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, contact, address } = req.body;
        const supplier = await prisma.supplier.update({
            where: { id },
            data: { name, contact, address },
        });
        res.json(supplier);
    } catch (error) {
        logger.error(`Failed to update supplier: ${error}`);
        res.status(500).json({ error: "Update failed" });
    }
};

export const deleteSupplier = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.supplier.delete({ where: { id } });
        res.json({ message: "Supplier deleted" });
    } catch (error) {
        logger.error(`Failed to delete supplier: ${error}`);
        res.status(500).json({ error: "Delete failed" });
    }
};
