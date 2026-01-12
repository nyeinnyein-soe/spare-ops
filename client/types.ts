export type PartType =
  | "Remax Charger"
  | "Charging Cable"
  | "Micro Cable"
  | "Battery";

export enum RequestStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  RECEIVED = "RECEIVED",
}

export interface SpareItem {
  type: PartType;
  quantity: number;
}

export interface User {
  id: string;
  name: string;
  role: "admin" | "manager" | "sales";
  avatarColor: string;
  password: string;
}

export interface RequestRecord {
  id: string;
  requesterId: string;
  requesterName: string;
  items: SpareItem[];
  status: RequestStatus;
  createdAt: number;
  approvedAt?: number;
}

export interface UsageRecord {
  id: string;
  shopName: string;
  partType: PartType;
  usedAt: number;
  salespersonId: string;
  salespersonName: string;
  voucherImage?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const SPARE_PARTS: PartType[] = [
  "Remax Charger",
  "Charging Cable",
  "Micro Cable",
  "Battery",
];

export const INITIAL_USERS: User[] = [
  {
    id: "admin-1",
    name: "Admin",
    role: "admin",
    avatarColor: "bg-indigo-600",
    password: "admin",
  },
  {
    id: "sales-1",
    name: "Kyaw Kyaw",
    role: "sales",
    avatarColor: "bg-emerald-600",
    password: "sales",
  },
];

export const AVATAR_COLORS = [
  "bg-indigo-600",
  "bg-emerald-600",
  "bg-rose-600",
  "bg-amber-600",
  "bg-blue-600",
  "bg-purple-600",
  "bg-cyan-600",
  "bg-pink-600",
];

export type AppView =
  | "dashboard"
  | "form"
  | "history"
  | "insights"
  | "users"
  | "reports";
