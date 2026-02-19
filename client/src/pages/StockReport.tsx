import { useMemo, useCallback } from "react";
import {
  RotateCcw,
  Search,
  Download,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useData } from "../contexts/DataContext";
import { exportToExcel } from "../utils/excelHelper";
import DateRangePicker from "../components/DateRangePicker";
import { useReportFilters, filterByDateRange } from "../hooks/useReportFilters";

export default function StockReport() {
  const { inventoryItems, stockLogs } = useData();

  const filterFn = useCallback((item: any, searchQuery: string) => {
    return item.name.toLowerCase().includes(searchQuery.toLowerCase());
  }, []);

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
    handleSort,
  } = useReportFilters(inventoryItems, filterFn, {
    key: "name",
    direction: "asc",
  });

  const stockSnapshot = useMemo(() => {
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    return inventoryItems
      .filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .map((item) => {
        const logsInPeriod = stockLogs.filter(
          (l) =>
            l.inventoryItemId === item.id &&
            new Date(l.createdAt) >= start &&
            new Date(l.createdAt) <= end,
        );

        const logsAfterPeriod = stockLogs.filter(
          (l) => l.inventoryItemId === item.id && new Date(l.createdAt) > end,
        );

        const totalIn = logsInPeriod
          .filter((l) => l.change > 0)
          .reduce((sum, l) => sum + l.change, 0);

        const totalOut = Math.abs(
          logsInPeriod
            .filter((l) => l.change < 0)
            .reduce((sum, l) => sum + l.change, 0),
        );

        const changeAfter = logsAfterPeriod.reduce(
          (sum, l) => sum + l.change,
          0,
        );
        const periodEndStock = item.currentStock - changeAfter;
        const periodStartStock = periodEndStock - (totalIn - totalOut);

        return {
          id: item.id,
          name: item.name,
          startStock: periodStartStock,
          totalIn,
          totalOut,
          endStock: periodEndStock,
          current: item.currentStock,
        };
      });
  }, [inventoryItems, stockLogs, startDate, endDate, searchQuery]);

  const stats = useMemo(() => {
    const totalIn = stockSnapshot.reduce((sum, s) => sum + s.totalIn, 0);
    const totalOut = stockSnapshot.reduce((sum, s) => sum + s.totalOut, 0);
    return {
      totalIn,
      totalOut,
      netChange: totalIn - totalOut,
    };
  }, [stockSnapshot]);

  const sortedData = useMemo(() => {
    const data = [...stockSnapshot];
    if (!sortConfig.key || !sortConfig.direction) return data;

    return data.sort((a: any, b: any) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === "name") {
        aVal = (a.name || "").toLowerCase();
        bVal = (b.name || "").toLowerCase();
      }

      if (sortConfig.direction === "asc") return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
  }, [stockSnapshot, sortConfig]);

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
    const dataToExport = sortedData.map((s) => ({
      Item: s.name,
      "Opening Stock": s.startStock,
      "Stock Received (+)": s.totalIn,
      "Stock Deployed (-)": s.totalOut,
      "Closing Stock": s.endStock,
      "Current Balance": s.current,
    }));
    await exportToExcel(dataToExport, `Stock_Inventory_Report_${timestamp}`);
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="w-8 h-1 bg-indigo-600 rounded-full" />
        <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
          Stock Summary Report
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
                placeholder="Search items..."
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
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <ChevronUp size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">
              Stock In (+)
            </p>
            <p className="text-xl font-black text-slate-900 leading-none">
              {stats.totalIn}
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
            <ChevronDown size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">
              Stock Out (-)
            </p>
            <p className="text-xl font-black text-slate-900 leading-none">
              {stats.totalOut}
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div
            className={`h-12 w-12 rounded-2xl ${stats.netChange >= 0 ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"} flex items-center justify-center`}
          >
            <RotateCcw size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">
              Net Change
            </p>
            <p className="text-xl font-black text-slate-900 leading-none">
              {stats.netChange > 0 ? "+" : ""}
              {stats.netChange}
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
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center">
                  Part Name <SortIndicator column="name" />
                </div>
              </th>
              <th
                className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("startStock")}
              >
                <div className="flex items-center">
                  Opening <SortIndicator column="startStock" />
                </div>
              </th>
              <th
                className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("totalIn")}
              >
                <div className="flex items-center text-emerald-600">
                  Stock In (+) <SortIndicator column="totalIn" />
                </div>
              </th>
              <th
                className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("totalOut")}
              >
                <div className="flex items-center text-rose-600">
                  Stock Out (-) <SortIndicator column="totalOut" />
                </div>
              </th>
              <th
                className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("endStock")}
              >
                <div className="flex items-center font-bold text-slate-900">
                  Closing <SortIndicator column="endStock" />
                </div>
              </th>
              <th
                className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("current")}
              >
                <div className="flex items-center">
                  Live Balance <SortIndicator column="current" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {paginatedData.map((s) => (
              <tr
                key={s.id}
                className="hover:bg-slate-50 group transition-colors"
              >
                <td className="px-6 py-4 font-bold text-slate-900">{s.name}</td>
                <td className="px-6 py-4 text-slate-500 font-medium">
                  {s.startStock}
                </td>
                <td className="px-6 py-4 text-emerald-600 font-black">
                  +{s.totalIn}
                </td>
                <td className="px-6 py-4 text-rose-600 font-black">
                  -{s.totalOut}
                </td>
                <td className="px-6 py-4 font-black text-slate-900">
                  {s.endStock}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${s.current <= 10 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}
                  >
                    {s.current} Units
                  </span>
                </td>
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
