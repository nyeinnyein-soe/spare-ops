import React, { useState } from "react";
import {
  UserPlus,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  User as UserIcon,
  Edit2,
  Trash2,
  Lock,
} from "lucide-react";
import { useData } from "../contexts/DataContext";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../services/dbService";
import { User, AVATAR_COLORS } from "../types";

export default function Staff() {
  const { users, refreshData } = useData();
  const { currentUser } = useAuth();

  const [isAdding, setIsAdding] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    role: "sales" as any,
    password: "",
  });

  const canManage = (targetUser: User) => {
    if (currentUser?.role === "admin") return true;
    if (currentUser?.role === "manager") return targetUser.role !== "admin";
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await db.users.update({ ...editingUser, ...formData });
      } else {
        const avatarColor =
          AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
        await db.users.insert({ ...formData, avatarColor });
      }
      refreshData();
      setFormData({ name: "", role: "sales", password: "" });
      setIsAdding(false);
      setEditingUser(null);
    } catch (e) {
      alert("Operation failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete user?")) {
      await db.users.delete(id);
      refreshData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">
          Staff Account Management
        </h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 transition-all shadow-xl shadow-indigo-100"
        >
          {isAdding ? <XCircle size={18} /> : <UserPlus size={18} />}{" "}
          {isAdding ? "Cancel" : "Register User"}
        </button>
      </div>

      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-10 rounded-3xl border border-indigo-100 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">
                Name
              </label>
              <input
                autoFocus
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full p-4 border rounded-xl outline-none focus:border-indigo-500 shadow-sm"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value as any })
                }
                className="w-full p-4 border rounded-xl outline-none shadow-sm"
              >
                <option value="sales">Sales Representative</option>
                <option value="manager">Regional Manager</option>
                {currentUser?.role === "admin" && (
                  <option value="admin">Administrator</option>
                )}
              </select>
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">
                Password {editingUser && "(Leave blank to keep)"}
              </label>
              <input
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full p-4 border rounded-xl outline-none focus:border-indigo-500 shadow-sm"
                required={!editingUser}
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 transition-all hover:bg-indigo-700 active:scale-95"
          >
            {editingUser ? "Update" : "Create"}
          </button>
        </form>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y">
          {users.map((u) => (
            <div
              key={u.id}
              className="p-6 flex items-center justify-between group hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-5">
                <div
                  className={`h-14 w-14 rounded-2xl ${u.avatarColor || "bg-gray-400"} flex items-center justify-center text-white font-black text-xl shadow-inner`}
                >
                  {u.name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                    {u.name}{" "}
                    {u.role === "admin" ? (
                      <ShieldCheck size={16} className="text-indigo-600" />
                    ) : u.role === "manager" ? (
                      <ShieldAlert size={16} className="text-amber-600" />
                    ) : (
                      <UserIcon size={16} className="text-emerald-600" />
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    {u.role} Account
                  </div>
                </div>
              </div>
              {canManage(u) ? (
                <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingUser(u);
                      setFormData({ name: u.name, role: u.role, password: "" });
                      setIsAdding(true);
                    }}
                    className="p-3 text-slate-400 hover:text-indigo-600 bg-white border rounded-xl shadow-sm transition-all"
                  >
                    <Edit2 size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="p-3 text-slate-400 hover:text-rose-600 bg-white border rounded-xl shadow-sm transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ) : (
                <div className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <Lock size={12} /> Restricted
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
