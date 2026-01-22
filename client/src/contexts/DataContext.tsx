import React, { createContext, useContext, useState, useEffect } from "react";
import {
  User,
  RequestRecord,
  UsageRecord,
  NotificationItem,
  InventoryItem,
} from "../types";
import { db } from "../services/dbService";
import { useAuth } from "./AuthContext";

interface DataContextType {
  users: User[];
  requests: RequestRecord[];
  usages: UsageRecord[];
  notifications: NotificationItem[];
  inventoryItems: InventoryItem[];
  loading: boolean;
  refreshData: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  clearNotifications: () => Promise<void>;
  showToast: (msg: string) => void;
  toast: { msg: string; show: boolean };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, logout } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [usages, setUsages] = useState<UsageRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState({ msg: "", show: false });

  const showToast = (msg: string) => {
    setToast({ msg, show: true });
    setTimeout(() => setToast({ msg: "", show: false }), 3000);
  };

  const syncData = async (isBackground = false) => {
    if (!localStorage.getItem("spareops_token")) return;

    if (!isBackground) setLoading(true);
    try {
      const [u, r, usg, n, inv] = await Promise.all([
        db.users.select(),
        db.requests.select(),
        db.usages.select(),
        db.notifications.select(),
        db.inventory.select(),
      ]);

      setUsers(u || []);
      setRequests(r || []);
      setUsages(usg || []);
      setInventoryItems(inv || []);

      if (isBackground) {
        const oldUnread = notifications.filter((x) => !x.isRead).length;
        const newUnread = (n || []).filter((x) => !x.isRead).length;

        if (newUnread > oldUnread) {
          const latest = (n || [])[0];
          showToast(`New Alert: ${latest?.title || "Update received"}`);
        }
      }
      setNotifications(n || []);
    } catch (err: any) {
      console.error("Sync error:", err);
      if (err.message?.includes("401") || err.message?.includes("403")) {
        logout();
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const markNotificationRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    await db.notifications.markRead(id);
  };

  const clearNotifications = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await db.notifications.clearAll();
  };

  useEffect(() => {
    if (currentUser) {
      syncData(false);
      const interval = setInterval(() => syncData(true), 5000);
      return () => clearInterval(interval);
    } else {
      setUsers([]);
      setRequests([]);
      setUsages([]);
      setNotifications([]);
      setInventoryItems([]);
    }
  }, [currentUser]);

  return (
    <DataContext.Provider
      value={{
        users,
        requests,
        usages,
        notifications,
        inventoryItems,
        loading,
        refreshData: () => syncData(true),
        markNotificationRead,
        clearNotifications,
        showToast,
        toast,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within a DataProvider");
  return context;
};
