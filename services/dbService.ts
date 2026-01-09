
import { User, RequestRecord, UsageRecord, INITIAL_USERS } from "../types";

/**
 * LOCAL STORAGE DATABASE SERVICE
 * 
 * This service provides a "Database" experience using the browser's storage.
 * It maintains the same interface as an API client, making it easy to swap later.
 */

const STORAGE_KEYS = {
  USERS: 'spareops_local_users',
  REQUESTS: 'spareops_local_requests',
  USAGES: 'spareops_local_usages'
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getData = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const setData = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Initialize Users if empty
if (getData(STORAGE_KEYS.USERS).length === 0) {
  setData(STORAGE_KEYS.USERS, INITIAL_USERS);
}

export const db = {
  // Always returns true for local version
  ping: async (): Promise<boolean> => {
    await delay(100);
    return true;
  },

  users: {
    select: async (): Promise<User[]> => {
      await delay(200);
      return getData<User>(STORAGE_KEYS.USERS);
    },
    insert: async (user: User): Promise<void> => {
      await delay(200);
      const data = getData<User>(STORAGE_KEYS.USERS);
      data.push(user);
      setData(STORAGE_KEYS.USERS, data);
    },
    update: async (user: User): Promise<void> => {
      await delay(200);
      const data = getData<User>(STORAGE_KEYS.USERS);
      const index = data.findIndex(u => u.id === user.id);
      if (index !== -1) {
        data[index] = user;
        setData(STORAGE_KEYS.USERS, data);
      }
    },
    delete: async (id: string): Promise<void> => {
      await delay(200);
      const data = getData<User>(STORAGE_KEYS.USERS);
      setData(STORAGE_KEYS.USERS, data.filter(u => u.id !== id));
    }
  },

  requests: {
    select: async (): Promise<RequestRecord[]> => {
      await delay(200);
      return getData<RequestRecord>(STORAGE_KEYS.REQUESTS);
    },
    insert: async (req: RequestRecord): Promise<void> => {
      await delay(200);
      const data = getData<RequestRecord>(STORAGE_KEYS.REQUESTS);
      data.unshift(req);
      setData(STORAGE_KEYS.REQUESTS, data);
    },
    update: async (req: RequestRecord): Promise<void> => {
      await delay(200);
      const data = getData<RequestRecord>(STORAGE_KEYS.REQUESTS);
      const index = data.findIndex(r => r.id === req.id);
      if (index !== -1) {
        data[index] = req;
        setData(STORAGE_KEYS.REQUESTS, data);
      }
    },
    delete: async (id: string): Promise<void> => {
      await delay(200);
      const data = getData<RequestRecord>(STORAGE_KEYS.REQUESTS);
      setData(STORAGE_KEYS.REQUESTS, data.filter(r => r.id !== id));
    }
  },

  usages: {
    select: async (): Promise<UsageRecord[]> => {
      await delay(200);
      return getData<UsageRecord>(STORAGE_KEYS.USAGES);
    },
    insert: async (usage: UsageRecord): Promise<void> => {
      await delay(200);
      const data = getData<UsageRecord>(STORAGE_KEYS.USAGES);
      data.unshift(usage);
      setData(STORAGE_KEYS.USAGES, data);
    },
    update: async (usage: UsageRecord): Promise<void> => {
      await delay(200);
      const data = getData<UsageRecord>(STORAGE_KEYS.USAGES);
      const index = data.findIndex(u => u.id === usage.id);
      if (index !== -1) {
        data[index] = usage;
        setData(STORAGE_KEYS.USAGES, data);
      }
    },
    delete: async (id: string): Promise<void> => {
      await delay(200);
      const data = getData<UsageRecord>(STORAGE_KEYS.USAGES);
      setData(STORAGE_KEYS.USAGES, data.filter(u => u.id !== id));
    }
  }
};
