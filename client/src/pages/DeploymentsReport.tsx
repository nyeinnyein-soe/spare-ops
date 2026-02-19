import { useState, useMemo, useCallback } from "react";
import {
  RotateCcw,
  Search,
  Download,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit2,
  X,
  ClipboardList,
  Home,
  Package,
  Image as ImageIcon,
} from "lucide-react";
import { useData } from "../contexts/DataContext";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../services/dbService";
import { UsageRecord } from "../types";
import { exportToExcel } from "../utils/excelHelper";
import DateRangePicker from "../components/DateRangePicker";
import ImageViewer from "../components/ImageViewer";
import { useReportFilters, filterByDateRange } from "../hooks/useReportFilters";

export default function DeploymentsReport() {
  const { usages, inventoryItems, refreshData } = useData();
  const { currentUser } = useAuth();

  const [editingUsage, setEditingUsage] = useState<UsageRecord | null>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);

  const filterFn = useCallback(
    (u: any, searchQuery: string, startDate: string, endDate: string) => {
      const matchesSearch =
        u.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.salespersonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.partType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.remarks &&
          u.remarks.toLowerCase().includes(searchQuery.toLowerCase()));

      if (searchQuery) return matchesSearch;
      return filterByDateRange(u.usedAt, startDate, endDate);
    },
    [],
  );

  const {
    searchQuery,
    setSearchQuery,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    sortConfig,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    handleResetDates,
    applyQuickFilter,
    filteredData,
    handleSort,
  } = useReportFilters(usages, filterFn);

  const stats = useMemo(() => {
    const uniqueShops = new Set(filteredData.map((u) => u.shopName)).size;
    const uniqueItems = new Set(filteredData.map((u) => u.partType)).size;
    return {
      total: filteredData.length,
      shops: uniqueShops,
      items: uniqueItems,
    };
  }, [filteredData]);

  const sortedData = useMemo(() => {
    const data = [...filteredData];
    if (!sortConfig.key || !sortConfig.direction) return data;

    return data.sort((a, b) => {
      let aVal: any = "";
      let bVal: any = "";

      if (sortConfig.key === "date") {
        aVal = new Date(a.usedAt).getTime();
        bVal = new Date(b.usedAt).getTime();
      } else if (sortConfig.key === "shop") {
        aVal = a.shopName.toLowerCase();
        bVal = b.shopName.toLowerCase();
      } else if (sortConfig.key === "items") {
        aVal = a.partType.toLowerCase();
        bVal = b.partType.toLowerCase();
      } else if (sortConfig.key === "staff") {
        aVal = a.salespersonName.toLowerCase();
        bVal = b.salespersonName.toLowerCase();
      }

      if (sortConfig.direction === "asc") return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
  }, [filteredData, sortConfig]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const SortIndicator = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) return null;
    return sortConfig.direction === "asc" ? (
      <ChevronUp size={14} className="ml-1" />
    ) : sortConfig.direction === "desc" ? (
      <ChevronDown size={14} className="ml-1" />
    ) : null;
  };

  const handleExport = async () => {
    const timestamp = new Date().toISOString().split("T")[0];
    const dataToExport = sortedData.map((u) => ({
      Date: new Date(u.usedAt).toLocaleDateString(),
      "Shop Name": u.shopName,
      "Item Type": u.partType,
      "Staff Name": u.salespersonName,
      Remarks: u.remarks || "-",
    }));
    await exportToExcel(dataToExport, `Deployments_Report_${timestamp}`);
  };

  const deleteItem = async (id: string) => {
    if (confirm("Delete this record?")) {
      await db.usages.delete(id);
      refreshData();
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

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="w-8 h-1 bg-indigo-600 rounded-full" />
        <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
          Deployments Report
        </h1>
      </div>

      {viewImage && (
        <ImageViewer src={viewImage} onClose={() => setViewImage(null)} />
      )}

      {editingUsage && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-6 z-50">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between mb-6">
              <h2 className="text-xl font-bold">Edit Usage</h2>
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
        <div className="flex flex-wrap items-center gap-3 xl:justify-start flex-1">
          <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 min-w-[240px] max-w-sm group focus-within:border-indigo-500/30 transition-all">
            <div className="flex items-center w-full bg-slate-50 rounded-xl px-4 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
              <Search
                size={16}
                className="text-slate-400 group-focus-within:text-indigo-500 transition-colors shrink-0"
              />
              <input
                type="text"
                placeholder="Search deployments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-1 py-2.5 bg-transparent border-none text-[11px] font-bold focus:ring-0 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

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
                <option value="" disabled>
                  Range
                </option>
                <option value="this-week">This Week</option>
                <option value="last-week">Last Week</option>
                <option value="this-month">This Month</option>
                <option value="last-month">Last Month</option>
                <option value="this-year">This Year</option>
                <option value="last-year">Last Year</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
            <button
              onClick={handleResetDates}
              className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all group"
              title="Reset Filters"
            >
              <RotateCcw
                size={16}
                className="group-active:rotate-180 transition-transform duration-500"
              />
            </button>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-wider shadow-lg shadow-emerald-200 transition-all active:scale-95 hover:-translate-y-0.5 whitespace-nowrap"
          >
            <Download size={16} /> Export Data
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-in slide-in-from-top duration-500">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <ClipboardList size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">
              Total Logs
            </p>
            <p className="text-xl font-black text-slate-900 leading-none">
              {stats.total}
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Home size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">
              Active Shops
            </p>
            <p className="text-xl font-black text-slate-900 leading-none">
              {stats.shops}
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Package size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">
              Unique Spares
            </p>
            <p className="text-xl font-black text-slate-900 leading-none">
              {stats.items}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b">
            <tr>
              <th
                className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("date")}
              >
                <div className="flex items-center">
                  Date <SortIndicator column="date" />
                </div>
              </th>
              <th className="px-6 py-4">Proof</th>
              <th
                className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("shop")}
              >
                <div className="flex items-center">
                  Shop <SortIndicator column="shop" />
                </div>
              </th>
              <th
                className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("items")}
              >
                <div className="flex items-center">
                  Item(s) <SortIndicator column="items" />
                </div>
              </th>
              <th className="px-6 py-4">Remark</th>
              <th
                className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("staff")}
              >
                <div className="flex items-center">
                  Staff <SortIndicator column="staff" />
                </div>
              </th>
              {currentUser?.role === "admin" && (
                <th className="px-6 py-4 text-right">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {paginatedData.map((u) => (
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
                        {u.remarks
                          .replace("[MIGRATED] ", "")
                          .replace("[MIGRATED]", "")}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>
                <td className="px-6 py-4 font-medium">{u.salespersonName}</td>
                {currentUser?.role === "admin" && (
                  <td className="px-6 py-4 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingUsage(u)}
                      className="p-2 text-slate-400 hover:text-indigo-600"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => deleteItem(u.id)}
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom duration-500">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
            Showing{" "}
            <span className="text-slate-900">
              {(currentPage - 1) * itemsPerPage + 1}
            </span>{" "}
            to{" "}
            <span className="text-slate-900">
              {Math.min(currentPage * itemsPerPage, sortedData.length)}
            </span>{" "}
            of <span className="text-slate-900">{sortedData.length}</span>{" "}
            results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => {
                const pageNum = i + 1;
                if (
                  totalPages > 7 &&
                  pageNum !== 1 &&
                  pageNum !== totalPages &&
                  Math.abs(pageNum - currentPage) > 1
                ) {
                  if (pageNum === 2 || pageNum === totalPages - 1)
                    return (
                      <span key={pageNum} className="px-1 text-slate-300">
                        ...
                      </span>
                    );
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
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
