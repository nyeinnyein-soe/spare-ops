import React, { createContext, useContext, useState, useEffect } from "react";
import { User, RequestRecord, UsageRecord, NotificationItem } from "../types";
import { db } from "../services/dbService";
import { useAuth } from "./AuthContext";

interface DataContextType {
  users: User[];
  requests: RequestRecord[];
  usages: UsageRecord[];
  notifications: NotificationItem[];
  loading: boolean;
  refreshData: () => Promise<void>; // Forces an update immediately
  markNotificationRead: (id: string) => Promise<void>;
  clearNotifications: () => Promise<void>;

  // Toast Logic
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
  const [loading, setLoading] = useState(false);

  // Toast State
  const [toast, setToast] = useState({ msg: "", show: false });

  const showToast = (msg: string) => {
    setToast({ msg, show: true });
    // Auto-hide after 3s
    setTimeout(() => setToast({ msg: "", show: false }), 3000);
  };

  // The Main Sync Function
  const syncData = async (isBackground = false) => {
    // Safety check: Don't fetch if no token
    if (!localStorage.getItem("spareops_token")) return;

    if (!isBackground) setLoading(true);
    try {
      const [u, r, usg, n] = await Promise.all([
        db.users.select(),
        db.requests.select(),
        db.usages.select(),
        db.notifications.select(),
      ]);

      setUsers(u || []);
      setRequests(r || []);
      setUsages(usg || []);

      // Notification Toaster Logic
      if (isBackground) {
        const oldUnread = notifications.filter((x) => !x.isRead).length;
        const newUnread = (n || []).filter((x) => !x.isRead).length;

        // If we have MORE unread items than before, show a popup
        if (newUnread > oldUnread) {
          const latest = (n || [])[0];
          showToast(`New Alert: ${latest?.title || "Update received"}`);
        }
      }
      setNotifications(n || []);
    } catch (err: any) {
      console.error("Sync error:", err);
      // If token is invalid (401), force logout
      if (err.message?.includes("401") || err.message?.includes("403")) {
        logout();
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  // Helper: Mark Read
  const markNotificationRead = async (id: string) => {
    // Optimistic Update (Update UI instantly)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    // Background API Call
    await db.notifications.markRead(id);
  };

  // Helper: Clear All
  const clearNotifications = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await db.notifications.clearAll();
  };

  // Polling Effect
  useEffect(() => {
    if (currentUser) {
      syncData(false); // Initial load (with spinner)
      const interval = setInterval(() => syncData(true), 5000); // Poll every 5s (silent)
      return () => clearInterval(interval);
    } else {
      // Clear data if logged out
      setUsers([]);
      setRequests([]);
      setUsages([]);
      setNotifications([]);
    }
  }, [currentUser]);

  return (
    <DataContext.Provider
      value={{
        users,
        requests,
        usages,
        notifications,
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
