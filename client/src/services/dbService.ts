import { api } from "./api";
import {
  User,
  RequestRecord,
  UsageRecord,
  RequestStatus,
  InventoryItem,
  Merchant,
  Shop,
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
    }): Promise<void> => {
      await api.post("/inventory-items", data);
    },
    update: async (
      id: string,
      data: { name: string; description?: string },
    ): Promise<void> => {
      await api.put(`/inventory-items/${id}`, data);
    },
    toggleArchive: async (id: string): Promise<void> => {
      await api.patch(`/inventory-items/${id}/archive`, {});
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
      return api.patch(`/notifications/${id}/read`, {});
    },
    clearAll: async () => {
      return api.post("/notifications/clear", {});
    },
  },
};
