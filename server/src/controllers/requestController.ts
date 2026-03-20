import { Request, Response } from "express";
import prisma from "../db";
import { sendNotification } from "./notificationController";
import logger from "../utils/logger";
import { sendTelegramMessage } from "../utils/telegram";

export const getRequests = async (req: Request, res: Response) => {
  try {
    const requests = await prisma.request.findMany({
      include: {
        items: {
          include: { inventoryItem: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const enrichedRequests = await Promise.all(
      requests.map(async (r: any) => {
        const user = await prisma.user.findUnique({
          where: { id: r.requesterId },
        });
        return {
          ...r,
          requesterName: user?.name || "Unknown",
          createdAt: r.createdAt.getTime(),
          approvedAt: r.approvedAt?.getTime(),
          items: r.items.map((i: any) => ({
            id: i.id,
            quantity: i.quantity,
            type: i.inventoryItem.name,
            inventoryItemId: i.inventoryItemId,
          })),
        };
      }),
    );

    res.json(enrichedRequests);
  } catch (error) {
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

    const managers = await prisma.user.findMany({
      where: { role: { in: ["admin", "manager"] } },
    });

    const requester = await prisma.user.findUnique({
      where: { id: requesterId },
    });

    // Fetch item names for the Telegram notification
    const itemDetails = await Promise.all(
      items.map(async (item: any) => {
        const invItem = await prisma.inventoryItem.findUnique({
          where: { id: item.inventoryItemId },
        });
        return `${invItem?.name || "Unknown"} (Qty: ${item.quantity})`;
      })
    );

    for (const manager of managers) {
      await sendNotification(
        manager.id,
        "New Requisition",
        `${requester?.name || "Staff"} requested new stock.`,
      );
    }

    // Send Telegram Notification to Admin Group (Fire and forget, non-blocking)
    sendTelegramMessage(
      `📦 <b>New Requisition</b>\n\n` +
      `<b>Requester:</b> ${requester?.name || "Staff"}\n` +
      `<b>Items:</b>\n- ${itemDetails.join("\n- ")}\n\n` +
      `<b>Status:</b> PENDING approval.`
    );

    res.status(201).json({ message: "Request created" });
  } catch (error) {
    res.status(500).json({ error: "Failed to create request" });
  }
};

export const updateStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { id: performerId } = (req as any).user;

    const data: any = { status };
    if (status === "APPROVED") {
      data.approvedAt = new Date();
    }

    const updatedRequest = await prisma.$transaction(async (tx: any) => {
      const existingReq = await tx.request.findUnique({
        where: { id },
        include: {
          items: { include: { inventoryItem: true } },
          requester: true,
        },
      });

      if (!existingReq) throw new Error("Request not found");

      if (status === "APPROVED") {
        // Validate stock
        for (const item of existingReq.items) {
          if (item.inventoryItem.currentStock < item.quantity) {
            throw new Error(
              `Insufficient stock for ${item.inventoryItem.name}. Available: ${item.inventoryItem.currentStock}, Requested: ${item.quantity}`,
            );
          }
        }

        // Reduce stock and log
        for (const item of existingReq.items) {
          await tx.inventoryItem.update({
            where: { id: item.inventoryItemId },
            data: { currentStock: { decrement: item.quantity } },
          });

          await tx.stockLog.create({
            data: {
              inventoryItemId: item.inventoryItemId,
              change: -item.quantity,
              previousStock: item.inventoryItem.currentStock,
              newStock: item.inventoryItem.currentStock - item.quantity,
              reason: "REQUEST_APPROVED",
              referenceId: id,
              performerId,
            },
          });
        }
      }

      return await tx.request.update({
        where: { id },
        data,
        include: { requester: true },
      });
    });

    if (status === "RECEIVED") {
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
      await sendNotification(
        updatedRequest.requesterId,
        `Request ${status}`,
        `Your request has been ${status.toLowerCase()}.`,
      );
    }

    res.json({ message: "Status updated" });
  } catch (error: any) {
    logger.error(`Update failed: ${error.message}`);
    res.status(400).json({ error: error.message || "Update failed" });
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
