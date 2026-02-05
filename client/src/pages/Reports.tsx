import React, { useState, useMemo } from "react";
import {
  RotateCcw,
  Edit2,
  Trash2,
  X,
  Download,
  Image as ImageIcon,
} from "lucide-react";
import { useData } from "../contexts/DataContext";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../services/dbService";
import { UsageRecord } from "../types";
import StatusBadge from "../components/StatusBadge";
import { exportToExcel } from "../utils/excelHelper";
import DateRangePicker from "../components/DateRangePicker";
import ImageViewer from "../components/ImageViewer";

export default function Reports() {
  // 1. Get inventoryItems from context
  const { requests, usages, inventoryItems, refreshData } = useData();
  const { currentUser } = useAuth();

  const [tab, setTab] = useState<"usage" | "request">("request");
  const [editingUsage, setEditingUsage] = useState<UsageRecord | null>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);

  // --- DATE FILTER STATE ---
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}-01`;
  });

  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  // --- FILTER LOGIC ---
  const filterByDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    return (!start || date >= start) && (!end || date <= end);
  };

  const filteredUsages = useMemo(() => {
    return usages.filter((u) => filterByDate(u.usedAt));
  }, [usages, startDate, endDate]);

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => filterByDate(r.createdAt));
  }, [requests, startDate, endDate]);

  const handleResetDates = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    setStartDate(`${year}-${month}-01`);
    setEndDate(`${year}-${month}-${day}`);
  };

  const handleExport = async () => {
    const timestamp = new Date().toISOString().split("T")[0];

    if (tab === "usage") {
      const dataToExport = filteredUsages.map((u) => ({
        Date: new Date(u.usedAt).toLocaleDateString(),
        "Shop Name": u.shopName,
        "Item Type": u.partType,
        "Staff Name": u.salespersonName,
        "Remarks": u.remarks || "-",
        "Voucher Attached": u.voucherImage ? "Yes" : "No",
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
      {viewImage && (
        <ImageViewer src={viewImage} onClose={() => setViewImage(null)} />
      )}

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
                {/* 2. Updated Select to use Dynamic Inventory Items */}
                <select
                  value={editingUsage.inventoryItemId}
                  onChange={(e) =>
                    setEditingUsage({
                      ...editingUsage,
                      inventoryItemId: e.target.value,
                    })
                  }
                  className="w-full p-4 border rounded-xl mt-1 outline-none bg-white"
                >
                  {inventoryItems
                    .filter((i) => !i.isArchived)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
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
            onClick={() => setTab("request")}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${tab === "request" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500"}`}
          >
            Requisitions
          </button>
          <button
            onClick={() => setTab("usage")}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${tab === "usage" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500"}`}
          >
            Deployments
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden pr-2">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
            />
            <div className="w-px h-5 bg-slate-200 mx-1"></div>
            <button
              onClick={handleResetDates}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-all"
              title="Reset to current month"
            >
              <RotateCcw size={14} />
            </button>
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
              {tab === "usage" && <th className="px-6 py-4">Proof</th>}
              <th className="px-6 py-4">
                {tab === "usage" ? "Shop" : "Requester"}
              </th>
              <th className="px-6 py-4">Item(s)</th>
              {tab === "usage" && <th className="px-6 py-4">Remark</th>}
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
                  <td className="px-6 py-4">
                    <div
                      className="h-10 w-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                      onClick={() =>
                        u.voucherImage && setViewImage(u.voucherImage)
                      }
                    >
                      {u.voucherImage ? (
                        <img
                          src={u.voucherImage}
                          className="w-full h-full object-cover"
                          alt="Voucher"
                        />
                      ) : (
                        <ImageIcon size={16} className="text-slate-300" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold">{u.shopName}</td>
                  <td className="px-6 py-4 text-indigo-600 font-bold">
                    {u.partType}
                  </td>
                  <td className="px-6 py-4">
                    {u.remarks ? (
                      <div className="flex items-center gap-2">
                        {u.remarks.startsWith("[MIGRATED]") && (
                          <span className="shrink-0 bg-indigo-100 text-indigo-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">
                            Migrated
                          </span>
                        )}
                        <span className="text-slate-500 italic truncate max-w-[150px]">
                          {u.remarks.replace("[MIGRATED] ", "").replace("[MIGRATED]", "")}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
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
