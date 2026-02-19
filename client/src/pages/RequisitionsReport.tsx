import { useMemo, useCallback } from "react";
import {
  RotateCcw,
  Search,
  Download,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useData } from "../contexts/DataContext";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../services/dbService";
import StatusBadge from "../components/StatusBadge";
import { exportToExcel } from "../utils/excelHelper";
import DateRangePicker from "../components/DateRangePicker";
import { useReportFilters, filterByDateRange } from "../hooks/useReportFilters";

export default function RequisitionsReport() {
  const { requests, refreshData } = useData();
  const { currentUser } = useAuth();

  const filterFn = useCallback(
    (r: any, searchQuery: string, startDate: string, endDate: string) => {
      const matchesSearch =
        r.requesterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.items.some((item: any) =>
          item.type.toLowerCase().includes(searchQuery.toLowerCase()),
        );

      if (searchQuery) return matchesSearch;
      return filterByDateRange(r.createdAt, startDate, endDate);
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
  } = useReportFilters(requests, filterFn);

  const stats = useMemo(() => {
    const breakdown = filteredData.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      },
      { pending: 0, approved: 0, rejected: 0 } as Record<string, number>,
    );
    return {
      total: filteredData.length,
      ...breakdown,
    };
  }, [filteredData]);

  const sortedData = useMemo(() => {
    const data = [...filteredData];
    if (!sortConfig.key || !sortConfig.direction) return data;

    return data.sort((a, b) => {
      let aVal: any = "";
      let bVal: any = "";

      if (sortConfig.key === "date") {
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
      } else if (sortConfig.key === "requester") {
        aVal = a.requesterName.toLowerCase();
        bVal = b.requesterName.toLowerCase();
      } else if (sortConfig.key === "status") {
        aVal = a.status.toLowerCase();
        bVal = b.status.toLowerCase();
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
    const dataToExport = sortedData.map((r) => ({
      "Date Created": new Date(r.createdAt).toLocaleDateString(),
      Requester: r.requesterName,
      Items: r.items.map((i: any) => `${i.quantity}x ${i.type}`).join(", "),
      Status: r.status,
    }));
    await exportToExcel(dataToExport, `Requisitions_Report_${timestamp}`);
  };

  const deleteItem = async (id: string) => {
    if (confirm("Delete this record?")) {
      await db.requests.delete(id);
      refreshData();
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="w-8 h-1 bg-indigo-600 rounded-full" />
        <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
          Requisitions Report
        </h1>
      </div>

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
                placeholder="Search requisitions..."
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-top duration-500">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <ClipboardList size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">
              Total Asked
            </p>
            <p className="text-xl font-black text-slate-900 leading-none">
              {stats.total}
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">
              Pending
            </p>
            <p className="text-xl font-black text-slate-900 leading-none">
              {stats.pending}
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">
              Approved
            </p>
            <p className="text-xl font-black text-slate-900 leading-none">
              {stats.approved}
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
            <AlertCircle size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">
              Rejected
            </p>
            <p className="text-xl font-black text-slate-900 leading-none">
              {stats.rejected}
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
              <th
                className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("requester")}
              >
                <div className="flex items-center">
                  Requester <SortIndicator column="requester" />
                </div>
              </th>
              <th className="px-6 py-4">Item(s)</th>
              <th
                className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center">
                  Status <SortIndicator column="status" />
                </div>
              </th>
              {currentUser?.role === "admin" && (
                <th className="px-6 py-4 text-right">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {paginatedData.map((r) => (
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
                    .map((i: any) => `${i.quantity}x ${i.type}`)
                    .join(", ")}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={r.status} />
                </td>
                {currentUser?.role === "admin" && (
                  <td className="px-6 py-4 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => deleteItem(r.id)}
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
