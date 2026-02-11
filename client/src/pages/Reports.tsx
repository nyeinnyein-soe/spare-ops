import React, { useState, useMemo, useEffect } from "react";
import {
  RotateCcw,
  Edit2,
  Trash2,
  X,
  Download,
  Image as ImageIcon,
  Search,
  Package,
  Home,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
  // 1. Get inventoryItems and stockLogs from context
  const { requests, usages, inventoryItems, stockLogs, refreshData } = useData();
  const { currentUser } = useAuth();

  const [tab, setTab] = useState<"usage" | "request" | "stock">("request");
  const [editingUsage, setEditingUsage] = useState<UsageRecord | null>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" | null }>({ key: "date", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

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

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [tab, searchQuery, startDate, endDate, sortConfig]);

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
    return usages.filter((u) => {
      const matchesSearch =
        u.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.salespersonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.partType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.remarks && u.remarks.toLowerCase().includes(searchQuery.toLowerCase()));

      if (searchQuery) return matchesSearch;
      return filterByDate(u.usedAt);
    });
  }, [usages, startDate, endDate, searchQuery]);

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchesSearch =
        r.requesterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.items.some(item => item.type.toLowerCase().includes(searchQuery.toLowerCase()));

      if (searchQuery) return matchesSearch;
      return filterByDate(r.createdAt);
    });
  }, [requests, startDate, endDate, searchQuery]);

  const filteredStockLogs = useMemo(() => {
    return stockLogs.filter((log) => filterByDate(new Date(log.createdAt).getTime()));
  }, [stockLogs, startDate, endDate]);

  const stockSnapshot = useMemo(() => {
    if (tab !== "stock") return [];

    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    return inventoryItems.map((item) => {
      // Changes DURING the selected period
      const logsInPeriod = stockLogs.filter(
        (l) =>
          l.inventoryItemId === item.id &&
          new Date(l.createdAt) >= start &&
          new Date(l.createdAt) <= end
      );

      // Changes AFTER the selected period until NOW
      const logsAfterPeriod = stockLogs.filter(
        (l) =>
          l.inventoryItemId === item.id &&
          new Date(l.createdAt) > end
      );

      const totalIn = logsInPeriod
        .filter((l) => l.change > 0)
        .reduce((sum, l) => sum + l.change, 0);

      const totalOut = Math.abs(
        logsInPeriod
          .filter((l) => l.change < 0)
          .reduce((sum, l) => sum + l.change, 0)
      );

      const changeAfter = logsAfterPeriod.reduce((sum, l) => sum + l.change, 0);
      const periodEndStock = item.currentStock - changeAfter;
      const periodStartStock = periodEndStock - (totalIn - totalOut);

      return {
        id: item.id,
        name: item.name,
        startStock: periodStartStock,
        totalIn,
        totalOut,
        endStock: periodEndStock,
        current: item.currentStock
      };
    });
  }, [tab, inventoryItems, stockLogs, startDate, endDate]);

  const stats = useMemo(() => {
    if (tab === "usage") {
      const uniqueShops = new Set(filteredUsages.map(u => u.shopName)).size;
      const uniqueItems = new Set(filteredUsages.map(u => u.partType)).size;
      return {
        total: filteredUsages.length,
        shops: uniqueShops,
        items: uniqueItems
      };
    } else if (tab === "request") {
      const breakdown = filteredRequests.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, { pending: 0, approved: 0, rejected: 0 } as Record<string, number>);
      return {
        total: filteredRequests.length,
        ...breakdown
      };
    } else {
      const totalIn = stockSnapshot.reduce((sum, s) => sum + s.totalIn, 0);
      const totalOut = stockSnapshot.reduce((sum, s) => sum + s.totalOut, 0);
      return {
        totalIn,
        totalOut,
        netChange: totalIn - totalOut
      };
    }
  }, [tab, filteredUsages, filteredRequests, stockSnapshot]);

  const sortedData = useMemo(() => {
    const data = tab === "usage" ? [...filteredUsages] : tab === "request" ? [...filteredRequests] : [...stockSnapshot];
    if (!sortConfig.key || !sortConfig.direction) return data;

    return data.sort((a: any, b: any) => {
      let aVal: any = "";
      let bVal: any = "";

      if (tab === "usage") {
        if (sortConfig.key === "date") { aVal = new Date(a.usedAt).getTime(); bVal = new Date(b.usedAt).getTime(); }
        else if (sortConfig.key === "shop") { aVal = a.shopName.toLowerCase(); bVal = b.shopName.toLowerCase(); }
        else if (sortConfig.key === "items") { aVal = a.partType.toLowerCase(); bVal = b.partType.toLowerCase(); }
        else if (sortConfig.key === "staff") { aVal = a.salespersonName.toLowerCase(); bVal = b.salespersonName.toLowerCase(); }
      } else if (tab === "request") {
        if (sortConfig.key === "date") { aVal = new Date(a.createdAt).getTime(); bVal = new Date(b.createdAt).getTime(); }
        else if (sortConfig.key === "requester") { aVal = a.requesterName.toLowerCase(); bVal = b.requesterName.toLowerCase(); }
        else if (sortConfig.key === "status") { aVal = a.status.toLowerCase(); bVal = b.status.toLowerCase(); }
      } else {
        if (sortConfig.key === "name") { aVal = (a.name || "").toLowerCase(); bVal = (b.name || "").toLowerCase(); }
        else { aVal = (a as any)[sortConfig.key]; bVal = (b as any)[sortConfig.key]; }
      }

      if (sortConfig.direction === "asc") return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
  }, [tab, filteredUsages, filteredRequests, stockSnapshot, sortConfig]);

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" | null = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    } else if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = null;
    }
    setSortConfig({ key, direction });
  };

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const SortIndicator = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) return null;
    return sortConfig.direction === "asc" ? <ChevronUp size={14} className="ml-1" /> : sortConfig.direction === "desc" ? <ChevronDown size={14} className="ml-1" /> : null;
  };

  const handleResetDates = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    setStartDate(`${year}-${month}-01`);
    setEndDate(`${year}-${month}-${day}`);
  };

  const applyQuickFilter = (type: string) => {
    const now = new Date();
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    let start = new Date();
    let end = new Date();

    switch (type) {
      case "this-week":
        start.setDate(now.getDate() - now.getDay());
        break;
      case "last-week":
        start.setDate(now.getDate() - now.getDay() - 7);
        end.setDate(now.getDate() - now.getDay() - 1);
        break;
      case "this-month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "last-month":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "this-year":
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case "last-year":
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31);
        break;
      default:
        return;
    }

    setStartDate(formatDate(start));
    setEndDate(formatDate(end));
  };

  const handleExport = async () => {
    const timestamp = new Date().toISOString().split("T")[0];
    let dataToExport: any[] = [];
    let filename = "";

    if (tab === "usage") {
      dataToExport = (sortedData as typeof filteredUsages).map((u) => ({
        Date: new Date(u.usedAt).toLocaleDateString(),
        "Shop Name": u.shopName,
        "Item Type": u.partType,
        "Staff Name": u.salespersonName,
        "Remarks": u.remarks || "-",
      }));
      filename = `Deployments_Report_${timestamp}`;
    } else if (tab === "request") {
      dataToExport = (sortedData as typeof filteredRequests).map((r) => ({
        "Date Created": new Date(r.createdAt).toLocaleDateString(),
        Requester: r.requesterName,
        Items: r.items.map((i) => `${i.quantity}x ${i.type}`).join(", "),
        Status: r.status,
      }));
      filename = `Requisitions_Report_${timestamp}`;
    } else {
      dataToExport = (sortedData as typeof stockSnapshot).map((s) => ({
        Item: s.name,
        "Opening Stock": s.startStock,
        "Stock Received (+)": s.totalIn,
        "Stock Deployed (-)": s.totalOut,
        "Closing Stock": s.endStock,
        "Current Balance": s.current,
      }));
      filename = `Stock_Inventory_Report_${timestamp}`;
    }

    await exportToExcel(dataToExport, filename);
  };

  // ... (header UI, tab buttons etc)

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

      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6 pb-2">
        <div className="flex p-1.5 bg-slate-100 rounded-2xl w-fit shadow-inner shrink-0">
          <button
            onClick={() => setTab("request")}
            className={`px-8 py-2.5 rounded-xl text-xs font-black tracking-tight transition-all duration-200 ${tab === "request" ? "bg-white shadow-md text-indigo-600 scale-100" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"}`}
          >
            REQUISITIONS
          </button>
          <button
            onClick={() => setTab("usage")}
            className={`px-8 py-2.5 rounded-xl text-xs font-black tracking-tight transition-all duration-200 ${tab === "usage" ? "bg-white shadow-md text-indigo-600 scale-100" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"}`}
          >
            DEPLOYMENTS
          </button>
          <button
            onClick={() => setTab("stock")}
            className={`px-8 py-2.5 rounded-xl text-xs font-black tracking-tight transition-all duration-200 ${tab === "stock" ? "bg-white shadow-md text-indigo-600 scale-100" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"}`}
          >
            STOCK REPORT
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 xl:justify-end flex-1">
          {/* Search Box */}
          <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 min-w-[240px] max-w-sm group focus-within:border-indigo-500/30 transition-all">
            <div className="flex items-center w-full bg-slate-50 rounded-xl px-4 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
              <Search size={16} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors shrink-0" />
              <input
                type="text"
                placeholder="Search anything..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-1 py-2.5 bg-transparent border-none text-[11px] font-bold focus:ring-0 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Date Controls */}
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
            />

            <div className="w-px h-6 bg-slate-200"></div>

            <div className="relative">
              <select
                onChange={(e) => applyQuickFilter(e.target.value)}
                className="bg-slate-50 border-transparent text-slate-600 text-[10px] font-black uppercase pl-3 pr-8 py-2.5 rounded-xl outline-none hover:bg-slate-100 focus:bg-white transition-all cursor-pointer appearance-none min-w-[100px]"
                defaultValue=""
              >
                <option value="" disabled>Range</option>
                <option value="this-week">This Week</option>
                <option value="last-week">Last Week</option>
                <option value="this-month">This Month</option>
                <option value="last-month">Last Month</option>
                <option value="this-year">This Year</option>
                <option value="last-year">Last Year</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
              </div>
            </div>

            <button
              onClick={handleResetDates}
              className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all group"
              title="Reset Filters"
            >
              <RotateCcw size={16} className="group-active:rotate-180 transition-transform duration-500" />
            </button>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-wider shadow-lg shadow-slate-200 transition-all active:scale-95 hover:-translate-y-0.5 whitespace-nowrap"
          >
            <Download size={16} /> Export Data
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-top duration-500">
        {tab === "usage" ? (
          <>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <ClipboardList size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">Total Logs</p>
                <p className="text-xl font-black text-slate-900 leading-none">{(stats as any).total}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Home size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">Active Shops</p>
                <p className="text-xl font-black text-slate-900 leading-none">{(stats as any).shops}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Package size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">Unique Spares</p>
                <p className="text-xl font-black text-slate-900 leading-none">{(stats as any).items}</p>
              </div>
            </div>
          </>
        ) : tab === "request" ? (
          <>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <ClipboardList size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">Total Asked</p>
                <p className="text-xl font-black text-slate-900 leading-none">{(stats as any).total}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Clock size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">Pending</p>
                <p className="text-xl font-black text-slate-900 leading-none">{(stats as any).pending}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">Approved</p>
                <p className="text-xl font-black text-slate-900 leading-none">{(stats as any).approved}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
                <AlertCircle size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">Rejected</p>
                <p className="text-xl font-black text-slate-900 leading-none">{(stats as any).rejected}</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <ChevronUp size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">Stock In (+)</p>
                <p className="text-xl font-black text-slate-900 leading-none">{(stats as any).totalIn}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
                <ChevronDown size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">Stock Out (-)</p>
                <p className="text-xl font-black text-slate-900 leading-none">{(stats as any).totalOut}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className={`h-12 w-12 rounded-2xl ${(stats as any).netChange >= 0 ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"} flex items-center justify-center`}>
                <RotateCcw size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">Net Change</p>
                <p className="text-xl font-black text-slate-900 leading-none">{(stats as any).netChange > 0 ? "+" : ""}{(stats as any).netChange}</p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b">
            <tr>
              <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort(tab === "stock" ? "name" : "date")}>
                <div className="flex items-center">{tab === "stock" ? "Part Name" : "Date"} <SortIndicator column={tab === "stock" ? "name" : "date"} /></div>
              </th>
              {tab === "usage" && <th className="px-6 py-4">Proof</th>}
              {tab === "stock" ? (
                <>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("startStock")}>
                    <div className="flex items-center">Opening <SortIndicator column="startStock" /></div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("totalIn")}>
                    <div className="flex items-center text-emerald-600">Stock In (+) <SortIndicator column="totalIn" /></div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("totalOut")}>
                    <div className="flex items-center text-rose-600">Stock Out (-) <SortIndicator column="totalOut" /></div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("endStock")}>
                    <div className="flex items-center font-bold text-slate-900">Closing <SortIndicator column="endStock" /></div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("current")}>
                    <div className="flex items-center">Live Balance <SortIndicator column="current" /></div>
                  </th>
                </>
              ) : (
                <>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort(tab === "usage" ? "shop" : "requester")}>
                    <div className="flex items-center">
                      {tab === "usage" ? "Shop" : "Requester"} <SortIndicator column={tab === "usage" ? "shop" : "requester"} />
                    </div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => tab === "usage" && handleSort("items")}>
                    <div className="flex items-center">Item(s) {tab === "usage" && <SortIndicator column="items" />}</div>
                  </th>
                  {tab === "usage" && <th className="px-6 py-4">Remark</th>}
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort(tab === "usage" ? "staff" : "status")}>
                    <div className="flex items-center">
                      {tab === "usage" ? "Staff" : "Status"} <SortIndicator column={tab === "usage" ? "staff" : "status"} />
                    </div>
                  </th>
                </>
              )}
              {currentUser?.role === "admin" && tab !== "stock" && (
                <th className="px-6 py-4 text-right">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {tab === "stock" ? (
              (paginatedData as typeof stockSnapshot).map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 group transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900">{s.name}</td>
                  <td className="px-6 py-4 text-slate-500 font-medium">{s.startStock}</td>
                  <td className="px-6 py-4 text-emerald-600 font-black">+{s.totalIn}</td>
                  <td className="px-6 py-4 text-rose-600 font-black">-{s.totalOut}</td>
                  <td className="px-6 py-4 font-black text-slate-900">{s.endStock}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${s.current <= 10 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                      {s.current} Units
                    </span>
                  </td>
                </tr>
              ))
            ) : tab === "usage" ? (
              (paginatedData as typeof filteredUsages).map((u) => (
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
            ) : (paginatedData as typeof filteredRequests).map((r) => (
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom duration-500">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
            Showing <span className="text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-900">{Math.min(currentPage * itemsPerPage, sortedData.length)}</span> of <span className="text-slate-900">{sortedData.length}</span> results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => {
                const pageNum = i + 1;
                // Only show current, first, last, and relative pages for brevity if totalPages is large
                if (totalPages > 7 && pageNum !== 1 && pageNum !== totalPages && Math.abs(pageNum - currentPage) > 1) {
                  if (pageNum === 2 || pageNum === totalPages - 1) return <span key={pageNum} className="px-1 text-slate-300">...</span>;
                  return null;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-[36px] h-9 rounded-xl text-xs font-black transition-all ${currentPage === pageNum ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-500 hover:bg-slate-50"}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
