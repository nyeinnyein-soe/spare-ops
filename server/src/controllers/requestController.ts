import { Request, Response } from "express";
import prisma from "../db";

export const getRequests = async (req: Request, res: Response) => {
  try {
    const requests = await prisma.request.findMany({
      include: { items: true }, // Join the items table
      orderBy: { createdAt: "desc" },
    });

    // Flatten structure to match frontend expectations if necessary
    // But your frontend expects `requesterName`.
    // We should fetch the user name or store it.
    // Ideally, perform a join with User table.

    const enrichedRequests = await Promise.all(
      requests.map(async (r) => {
        const user = await prisma.user.findUnique({
          where: { id: r.requesterId },
        });
        return {
          ...r,
          requesterName: user?.name || "Unknown",
          createdAt: r.createdAt.getTime(), // Frontend uses number timestamps
          approvedAt: r.approvedAt?.getTime(),
        };
      }),
    );

    res.json(enrichedRequests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch requests" });
  }
};

export const createRequest = async (req: Request, res: Response) => {
  try {
    const { requesterId, items } = req.body;

    await prisma.request.create({
      data: {
        requesterId,
        items: {
          create: items, // Prisma handles the nested insert automatically
        },
      },
    });
    res.status(201).json({ message: "Request created" });
  } catch (error) {
    res.status(500).json({ error: "Failed to create request" });
  }
};

export const updateStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const data: any = { status };
    if (status === "APPROVED") {
      data.approvedAt = new Date();
    }

    await prisma.request.update({
      where: { id },
      data,
    });
    res.json({ message: "Status updated" });
  } catch (error) {
    res.status(500).json({ error: "Update failed" });
  }
};

export const deleteRequest = async (req: Request, res: Response) => {
  try {
    await prisma.request.delete({ where: { id: req.params.id } });
    res.json({ message: "Request deleted" });
  } catch (error) {
    res.status(500).json({ error: "Delete failed" });
  }
};
