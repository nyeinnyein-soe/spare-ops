import { api } from "./api";
import {
  User,
  RequestRecord,
  UsageRecord,
  RequestStatus,
  InventoryItem,
  Merchant,
  Shop,
  StockLog,
  Supplier,
} from "../types";

export const db = {
  users: {
    select: async (): Promise<User[]> => {
      return api.get("/users");
    },
    insert: async (user: Partial<User>): Promise<void> => {
      await api.post("/users", user);
    },
    update: async (user: User): Promise<void> => {
      await api.put(`/users/${user.id}`, user);
    },
    delete: async (id: string): Promise<void> => {
      await api.delete(`/users/${id}`);
    },
  },

  merchants: {
    select: async (): Promise<Merchant[]> => {
      return api.get("/merchants");
    },
    insert: async (data: Partial<Merchant>): Promise<void> => {
      await api.post("/merchants", data);
    },
    update: async (id: string, data: Partial<Merchant>): Promise<void> => {
      await api.put(`/merchants/${id}`, data);
    },
    delete: async (id: string): Promise<void> => {
      await api.delete(`/merchants/${id}`);
    },
    bulkInsert: async (data: any[]): Promise<void> => {
      await api.post("/merchants/bulk", data);
    },
  },


  shops: {
    select: async (): Promise<Shop[]> => {
      return api.get("/shops");
    },
    insert: async (data: Partial<Shop>): Promise<void> => {
      await api.post("/shops", data);
    },
    update: async (id: string, data: Partial<Shop>): Promise<void> => {
      await api.put(`/shops/${id}`, data);
    },
    delete: async (id: string): Promise<void> => {
      await api.delete(`/shops/${id}`);
    },
  },

  inventory: {
    select: async (): Promise<InventoryItem[]> => {
      return api.get("/inventory-items");
    },
    insert: async (data: {
      name: string;
      description?: string;
      currentStock?: number;
    }): Promise<void> => {
      await api.post("/inventory-items", data);
    },
    update: async (
      id: string,
      data: { name: string; description?: string; currentStock?: number },
    ): Promise<void> => {
      await api.put(`/inventory-items/${id}`, data);
    },
    toggleArchive: async (id: string): Promise<void> => {
      await api.patch(`/inventory-items/${id}/archive`, {});
    },
    adjust: async (
      id: string,
      data: { action: string; amount: number; remarks?: string; supplierId?: string },
    ): Promise<void> => {
      await api.post(`/inventory-items/${id}/adjust`, data);
    },
    getStockLogs: async (
      itemId?: string,
      supplierId?: string,
      startDate?: string,
      endDate?: string,
    ): Promise<StockLog[]> => {
      const params = new URLSearchParams();
      if (itemId) params.append("itemId", itemId);
      if (supplierId) params.append("supplierId", supplierId);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      const url = `/inventory-items/stock-logs${params.toString() ? `?${params.toString()}` : ""}`;
      return api.get(url);
    },
  },

  requests: {
    select: async (): Promise<RequestRecord[]> => {
      return api.get("/requests");
    },
    insert: async (
      requesterId: string,
      items: { inventoryItemId: string; quantity: number }[],
    ): Promise<void> => {
      await api.post("/requests", { requesterId, items });
    },
    updateStatus: async (id: string, status: RequestStatus): Promise<void> => {
      await api.patch(`/requests/${id}/status`, { status });
    },
    delete: async (id: string): Promise<void> => {
      await api.delete(`/requests/${id}`);
    },
  },

  usages: {
    select: async (): Promise<UsageRecord[]> => {
      return api.get("/usages");
    },
    insert: async (usage: Partial<UsageRecord>): Promise<void> => {
      await api.post("/usages", usage);
    },
    update: async (usage: Partial<UsageRecord>): Promise<void> => {
      await api.put(`/usages/${usage.id}`, {
        shopName: usage.shopName,
        shopId: usage.shopId,
        inventoryItemId: usage.inventoryItemId,
      });
    },
    delete: async (id: string): Promise<void> => {
      await api.delete(`/usages/${id}`);
    },
  },

  notifications: {
    select: async () => {
      return api.get("/notifications");
    },
    markRead: async (id: string) => {
      await api.patch(`/notifications/${id}/read`, {});
    },
    clearAll: async () => {
      await api.post("/notifications/clear", {});
    },
  },

  suppliers: {
    getAll: async (): Promise<Supplier[]> => {
      return api.get("/suppliers");
    },
    getById: async (id: string): Promise<Supplier> => {
      return api.get(`/suppliers/${id}`);
    },
    insert: async (data: Partial<Supplier>): Promise<Supplier> => {
      return api.post("/suppliers", data);
    },
    update: async (id: string, data: Partial<Supplier>): Promise<Supplier> => {
      return api.put(`/suppliers/${id}`, data);
    },
    delete: async (id: string): Promise<void> => {
      await api.delete(`/suppliers/${id}`);
    },
  },
};
