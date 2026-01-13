import React, { useState, useMemo } from "react";
import {
  Calendar,
  RotateCcw,
  Edit2,
  Trash2,
  Save,
  X,
  Download,
} from "lucide-react";
import { useData } from "../contexts/DataContext";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../services/dbService";
import { SPARE_PARTS, PartType, UsageRecord } from "../types";
import StatusBadge from "../components/StatusBadge";
import { exportToExcel } from "../utils/excelHelper";

export default function Reports() {
  const { requests, usages, refreshData } = useData();
  const { currentUser } = useAuth();

  const [tab, setTab] = useState<"usage" | "request">("usage");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [editingUsage, setEditingUsage] = useState<UsageRecord | null>(null);

  const filteredUsages = useMemo(() => {
    return usages.filter((u) => {
      const date = new Date(u.usedAt);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);
      return (!start || date >= start) && (!end || date <= end);
    });
  }, [usages, startDate, endDate]);

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const date = new Date(r.createdAt);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);
      return (!start || date >= start) && (!end || date <= end);
    });
  }, [requests, startDate, endDate]);

  const handleExport = async () => {
    const timestamp = new Date().toISOString().split("T")[0];

    if (tab === "usage") {
      const dataToExport = filteredUsages.map((u) => ({
        Date: new Date(u.usedAt).toLocaleDateString(),
        "Shop Name": u.shopName,
        "Item Type": u.partType,
        "Staff Name": u.salespersonName,
        "Reference ID": u.id,
      }));
      await exportToExcel(dataToExport, `Deployments_Report_${timestamp}`);
    } else {
      const dataToExport = filteredRequests.map((r) => ({
        "Date Created": new Date(r.createdAt).toLocaleDateString(),
        Requester: r.requesterName,
        Items: r.items.map((i) => `${i.quantity}x ${i.type}`).join(", "),
        Status: r.status,
        "Approved Date": r.approvedAt
          ? new Date(r.approvedAt).toLocaleDateString()
          : "-",
        "Reference ID": r.id,
      }));
      await exportToExcel(dataToExport, `Requisitions_Report_${timestamp}`);
    }
  };

  const handleUpdateUsage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUsage) {
      await db.usages.update(editingUsage);
      refreshData();
      setEditingUsage(null);
    }
  };

  const deleteItem = async (type: "usage" | "request", id: string) => {
    if (confirm("Delete this record?")) {
      if (type === "usage") await db.usages.delete(id);
      else await db.requests.delete(id);
      refreshData();
    }
  };

  return (
    <div className="space-y-6">
      {editingUsage && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-6 z-50">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between mb-6">
              <h2 className="text-xl font-bold">Edit</h2>
              <button onClick={() => setEditingUsage(null)}>
                <X />
              </button>
            </div>
            <form onSubmit={handleUpdateUsage} className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase">
                  Shop
                </label>
                <input
                  value={editingUsage.shopName}
                  onChange={(e) =>
                    setEditingUsage({
                      ...editingUsage,
                      shopName: e.target.value,
                    })
                  }
                  className="w-full p-4 border rounded-xl mt-1 outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase">
                  Type
                </label>
                <select
                  value={editingUsage.partType}
                  onChange={(e) =>
                    setEditingUsage({
                      ...editingUsage,
                      partType: e.target.value as PartType,
                    })
                  }
                  className="w-full p-4 border rounded-xl mt-1 outline-none"
                >
                  {SPARE_PARTS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all">
                Save
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex p-1 bg-slate-200/50 rounded-xl w-fit">
          <button
            onClick={() => setTab("usage")}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${tab === "usage" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500"}`}
          >
            Deployments
          </button>
          <button
            onClick={() => setTab("request")}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${tab === "request" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500"}`}
          >
            Requisitions
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            <Calendar size={16} className="text-slate-400 ml-1" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs font-bold outline-none border-none bg-transparent"
            />
            <span className="text-slate-300 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs font-bold outline-none border-none bg-transparent"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95"
          >
            <Download size={16} /> Export Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">
                {tab === "usage" ? "Shop" : "Requester"}
              </th>
              <th className="px-6 py-4">Item(s)</th>
              <th className="px-6 py-4">Status / Staff</th>
              {currentUser?.role === "admin" && (
                <th className="px-6 py-4 text-right">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {tab === "usage"
              ? filteredUsages.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50 group transition-colors"
                  >
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(u.usedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-bold">{u.shopName}</td>
                    <td className="px-6 py-4 text-indigo-600 font-bold">
                      {u.partType}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {u.salespersonName}
                    </td>
                    {currentUser?.role === "admin" && (
                      <td className="px-6 py-4 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingUsage(u)}
                          className="p-2 text-slate-400 hover:text-indigo-600"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deleteItem("usage", u.id)}
                          className="p-2 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              : filteredRequests.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50 group transition-colors"
                  >
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-bold">{r.requesterName}</td>
                    <td className="px-6 py-4">
                      {r.items
                        .map((i) => `${i.quantity}x ${i.type}`)
                        .join(", ")}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={r.status} />
                    </td>
                    {currentUser?.role === "admin" && (
                      <td className="px-6 py-4 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => deleteItem("request", r.id)}
                          className="p-2 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
