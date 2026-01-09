
import { User, RequestRecord, UsageRecord, INITIAL_USERS } from "../types";

/**
 * DATABASE SERVICE (MOCKING SQL OPERATIONS)
 * In a real app, these would be fetch() calls to a Node.js/MySQL backend.
 */

const STORAGE_KEYS = {
  USERS: 'spareops_db_users',
  REQUESTS: 'spareops_db_requests',
  USAGES: 'spareops_db_usages'
};

const getRaw = (key: string) => JSON.parse(localStorage.getItem(key) || '[]');
const saveRaw = (key: string, data: any) => localStorage.getItem(key) === null && key === STORAGE_KEYS.USERS 
  ? localStorage.setItem(key, JSON.stringify(INITIAL_USERS)) 
  : localStorage.setItem(key, JSON.stringify(data));

// Initialize if empty
if (!localStorage.getItem(STORAGE_KEYS.USERS)) saveRaw(STORAGE_KEYS.USERS, INITIAL_USERS);

export const db = {
  users: {
    select: async (): Promise<User[]> => {
      return getRaw(STORAGE_KEYS.USERS);
    },
    insert: async (user: User): Promise<void> => {
      const users = getRaw(STORAGE_KEYS.USERS);
      users.push(user);
      saveRaw(STORAGE_KEYS.USERS, users);
    },
    update: async (user: User): Promise<void> => {
      const users = getRaw(STORAGE_KEYS.USERS);
      const index = users.findIndex((u: User) => u.id === user.id);
      if (index !== -1) {
        users[index] = user;
        saveRaw(STORAGE_KEYS.USERS, users);
      }
    },
    delete: async (id: string): Promise<void> => {
      const users = getRaw(STORAGE_KEYS.USERS);
      saveRaw(STORAGE_KEYS.USERS, users.filter((u: User) => u.id !== id));
    }
  },
  requests: {
    select: async (): Promise<RequestRecord[]> => {
      return getRaw(STORAGE_KEYS.REQUESTS);
    },
    insert: async (req: RequestRecord): Promise<void> => {
      const items = getRaw(STORAGE_KEYS.REQUESTS);
      items.unshift(req);
      saveRaw(STORAGE_KEYS.REQUESTS, items);
    },
    update: async (req: RequestRecord): Promise<void> => {
      const items = getRaw(STORAGE_KEYS.REQUESTS);
      const index = items.findIndex((r: RequestRecord) => r.id === req.id);
      if (index !== -1) {
        items[index] = req;
        saveRaw(STORAGE_KEYS.REQUESTS, items);
      }
    },
    delete: async (id: string): Promise<void> => {
      const items = getRaw(STORAGE_KEYS.REQUESTS);
      saveRaw(STORAGE_KEYS.REQUESTS, items.filter((r: RequestRecord) => r.id !== id));
    }
  },
  usages: {
    select: async (): Promise<UsageRecord[]> => {
      return getRaw(STORAGE_KEYS.USAGES);
    },
    insert: async (usage: UsageRecord): Promise<void> => {
      const items = getRaw(STORAGE_KEYS.USAGES);
      items.unshift(usage);
      saveRaw(STORAGE_KEYS.USAGES, items);
    },
    update: async (usage: UsageRecord): Promise<void> => {
      const items = getRaw(STORAGE_KEYS.USAGES);
      const index = items.findIndex((u: UsageRecord) => u.id === usage.id);
      if (index !== -1) {
        items[index] = usage;
        saveRaw(STORAGE_KEYS.USAGES, items);
      }
    },
    delete: async (id: string): Promise<void> => {
      const items = getRaw(STORAGE_KEYS.USAGES);
      saveRaw(STORAGE_KEYS.USAGES, items.filter((u: UsageRecord) => u.id !== id));
    }
  }
};
