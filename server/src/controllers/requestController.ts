import { Request, Response } from "express";
import prisma from "../db";
import { sendNotification } from "./notificationController";

export const getRequests = async (req: Request, res: Response) => {
  try {
    const requests = await prisma.request.findMany({
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

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
          create: items,
        },
      },
    });

    // triger notification
    const managers = await prisma.user.findMany({
      where: { role: { in: ["admin", "manager"] } },
    });
    const requester = await prisma.user.findUnique({
      where: { id: requesterId },
    });

    for (const manager of managers) {
      await sendNotification(
        manager.id,
        "New Requisition",
        `${requester?.name || "Staff"} requested new stock.`,
      );
    }

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

    const updatedRequest = await prisma.request.update({
      where: { id },
      data,
      include: { requester: true },
    });

    if (status === "RECEIVED") {
      // notify to admin/manager if collected
      const managers = await prisma.user.findMany({
        where: { role: { in: ["admin", "manager"] } },
      });

      for (const manager of managers) {
        await sendNotification(
          manager.id,
          "Stock Collected",
          `${updatedRequest.requester.name} has collected their items.`,
        );
      }
    } else {
      // notify to himself if approved or rejected
      await sendNotification(
        updatedRequest.requesterId,
        `Request ${status}`,
        `Your request has been ${status.toLowerCase()}.`,
      );
    }

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
