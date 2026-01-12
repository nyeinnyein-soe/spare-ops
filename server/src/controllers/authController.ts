import { Request, Response } from "express";
import prisma from "../db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.JWT_SECRET || "secret";

export const login = async (req: Request, res: Response) => {
  const { name, password } = req.body;

  try {
    // 1. Find user by name
    const user = await prisma.user.findFirst({
      where: { name: name },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 2. Compare password hash
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 3. Generate Token
    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      SECRET_KEY,
      { expiresIn: "24h" },
    );

    // 4. Return User (without password) and Token
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getMe = async (req: Request, res: Response) => {
  res.json({ message: "Session valid", user: (req as any).user });
};
