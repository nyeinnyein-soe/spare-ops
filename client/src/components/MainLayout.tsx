import React, { useState, useRef, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  PlusCircle,
  History,
  Users as UsersIcon,
  FileText,
  Sparkles,
  LogOut,
  Package,
  ShieldCheck,
  ShieldAlert,
  User as UserIcon,
  Bell,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import Toast from "./Toast";
import ImageViewer from "./ImageViewer";

export default function MainLayout() {
  const { currentUser, logout } = useAuth();
  const {
    notifications,
    markNotificationRead,
    clearNotifications,
    refreshData,
    toast,
  } = useData();
  const navigate = useNavigate();
  const location = useLocation();

  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Click away listener for dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notifRef.current &&
        !notifRef.current.contains(event.target as Node)
      ) {
        setShowNotifDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const NavItem = ({
    path,
    icon,
    label,
  }: {
    path: string;
    icon: any;
    label: string;
  }) => {
    const isActive = location.pathname === path;
    return (
      <button
        onClick={() => navigate(path)}
        className={`flex items-center gap-3 px-3 py-3 rounded-2xl transition-all ${
          isActive
            ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100"
            : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        {icon}
        <span className="font-bold text-sm tracking-tight">{label}</span>
      </button>
    );
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 relative">
      <Toast message={toast.msg} show={toast.show} />

      {/* SIDEBAR */}
      <nav className="w-full md:w-64 bg-white border-r border-slate-200 p-4 flex flex-col gap-2 shadow-sm shrink-0 z-30">
        <div className="flex items-center gap-2 px-2 py-4 mb-4 border-b">
          <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-200">
            <Package size={24} />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800">
            SpareOps
          </span>
        </div>

        <NavItem
          path="/"
          icon={<LayoutDashboard size={20} />}
          label="Dashboard"
        />

        {currentUser.role === "sales" && (
          <NavItem
            path="/new-request"
            icon={<PlusCircle size={20} />}
            label="New Request"
          />
        )}

        <NavItem
          path="/history"
          icon={<History size={20} />}
          label="Activity Log"
        />

        {(currentUser.role === "admin" || currentUser.role === "manager") && (
          <>
            <NavItem
              path="/staff"
              icon={<UsersIcon size={20} />}
              label="Staff Directory"
            />
            <NavItem
              path="/reports"
              icon={<FileText size={20} />}
              label="Audit Reports"
            />
          </>
        )}

        {currentUser.role === "admin" && (
          <NavItem
            path="/insights"
            icon={<Sparkles size={20} />}
            label="AI Insights"
          />
        )}

        <div className="mt-auto pt-4 border-t space-y-4">
          <div className="px-3 py-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <div
              className={`h-8 w-8 rounded-full ${currentUser.avatarColor || "bg-indigo-600"} flex items-center justify-center text-white text-xs font-bold`}
            >
              {currentUser.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-bold text-slate-900 truncate">
                {currentUser.name}
              </div>
              <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                {currentUser.role}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold text-sm transition-all"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 md:p-10 overflow-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 capitalize">
            {location.pathname === "/"
              ? "Dashboard"
              : location.pathname.replace("/", "").replace("-", " ")}
          </h1>

          <div className="flex items-center">
            {/* NOTIFICATION BELL */}
            <div className="relative mr-4" ref={notifRef}>
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="p-2 bg-white rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors relative shadow-sm"
              >
                <Bell size={20} />
                {notifications.some((n) => !n.isRead) && (
                  <span className="absolute top-0 right-0 h-3 w-3 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
                )}
              </button>

              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                    <span className="font-bold text-xs uppercase tracking-widest text-slate-500">
                      Notifications
                    </span>
                    <button
                      onClick={async () => {
                        await clearNotifications();
                        refreshData(); // Refresh immediately
                      }}
                      className="text-[10px] font-bold text-indigo-600 hover:underline"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-64 overflow-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs italic">
                        No new alerts
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markNotificationRead(n.id)}
                          className={`p-4 border-b hover:bg-slate-50 cursor-pointer transition-colors ${!n.isRead ? "bg-indigo-50/30" : ""}`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span
                              className={`font-bold text-sm ${!n.isRead ? "text-indigo-700" : "text-slate-700"}`}
                            >
                              {n.title}
                            </span>
                            {!n.isRead && (
                              <span className="h-2 w-2 bg-indigo-500 rounded-full"></span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed mb-1">
                            {n.message}
                          </p>
                          <span className="text-[9px] font-black text-slate-300 uppercase block">
                            {new Date(n.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* SESSION BADGE */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-slate-200 shadow-sm">
              {currentUser.role === "admin" ? (
                <ShieldCheck size={16} className="text-indigo-600" />
              ) : currentUser.role === "manager" ? (
                <ShieldAlert size={16} className="text-amber-600" />
              ) : (
                <UserIcon size={16} className="text-emerald-600" />
              )}
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                {currentUser.role} Session
              </span>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT RENDERED HERE */}
        <section className="max-w-6xl mx-auto">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
