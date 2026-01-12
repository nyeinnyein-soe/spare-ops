import { api } from "./api";
import {
  User,
  RequestRecord,
  UsageRecord,
  RequestStatus,
  PartType,
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

  requests: {
    select: async (): Promise<RequestRecord[]> => {
      return api.get("/requests");
    },
    insert: async (
      requesterId: string,
      items: { type: PartType; quantity: number }[],
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
    update: async (usage: UsageRecord): Promise<void> => {
      await api.put(`/usages/${usage.id}`, {
        shopName: usage.shopName,
        partType: usage.partType,
      });
    },
    delete: async (id: string): Promise<void> => {
      await api.delete(`/usages/${id}`);
    },
  },
};
