import { Request, Response } from "express";
import prisma from "../db";

export const getMyNotifications = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  try {
    const notes = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: "Fetch failed" });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Update failed" });
  }
};

export const clearAll = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  try {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Clear failed" });
  }
};

export const sendNotification = async (
  userId: string,
  title: string,
  message: string,
) => {
  try {
    await prisma.notification.create({
      data: { userId, title, message },
    });
  } catch (e) {
    console.error("Failed to send notification", e);
  }
};
