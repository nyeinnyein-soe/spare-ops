export enum RequestStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  RECEIVED = "RECEIVED",
}

export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  isArchived: boolean;
}

export interface SpareItem {
  id?: string;
  inventoryItemId: string;
  type: string;
  quantity: number;
}

export interface User {
  id: string;
  name: string;
  role: "admin" | "manager" | "sales";
  avatarColor?: string;
  password?: string;
  createdAt?: string | number;
}

export interface RequestRecord {
  id: string;
  requesterId: string;
  requesterName?: string;
  items: SpareItem[];
  status: RequestStatus;
  createdAt: number;
  approvedAt?: number;
}

export interface UsageRecord {
  id: string;
  shopName: string; // Legacy display
  shopId?: string; // New ID
  inventoryItemId: string;
  partType: string;
  usedAt: number;
  salespersonId: string;
  salespersonName: string;
  remarks?: string;
  voucherImage?: string;
}

export interface Shop {
  id: string;
  code: string;
  name: string;
  merchantId: string;
  merchant?: Merchant;
}

export interface Merchant {
  id: string;
  code: string;
  name: string;
  shops?: Shop[];
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

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
