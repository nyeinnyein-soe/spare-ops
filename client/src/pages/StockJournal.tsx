import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  History,
  ArrowLeft,
  Package,
  Calendar,
  Truck,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Building2,
  RotateCcw,
} from "lucide-react";
import { db } from "../services/dbService";
import { StockLog, InventoryItem, Supplier } from "../types";
import DateRangePicker from "../components/DateRangePicker";

export default function StockJournal() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // 1. Capture filters
  const itemId = searchParams.get("itemId");
  const supplierId = searchParams.get("supplierId");

  const [logs, setLogs] = useState<StockLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetItem, setTargetItem] = useState<InventoryItem | null>(null);
  const [targetSupplier, setTargetSupplier] = useState<Supplier | null>(null);

  // --- DATE FILTER STATE (Default: Current Month) ---
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  });

  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // 2. Fetch Logic
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Parallel fetch for logs and context (item/supplier name)
        const [logsData, itemData, supplierData] = await Promise.all([
          db.inventory.getStockLogs(itemId || undefined, supplierId || undefined),
          itemId ? db.inventory.select().then(items => items.find(i => i.id === itemId) || null) : Promise.resolve(null),
          supplierId ? db.suppliers.getById(supplierId) : Promise.resolve(null)
        ]);

        setLogs(logsData);
        setTargetItem(itemData);
        setTargetSupplier(supplierData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [itemId, supplierId]);

  // 3. Filter logs by date locally
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const logDate = new Date(log.createdAt);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);

      return (!start || logDate >= start) && (!end || logDate <= end);
    });
  }, [logs, startDate, endDate]);

  // 4. Smart Header Logic
  const pageHeader = useMemo(() => {
    if (itemId) {
      return {
        title: targetItem ? `${targetItem.name} History` : "Item History",
        subtitle: "Timeline of inventory levels and adjustments.",
        icon: <Package className="text-indigo-600" size={36} />,
      };
    }
    if (supplierId) {
      return {
        title: targetSupplier ? `${targetSupplier.name}` : "Supplier Transactions",
        subtitle: "Log of all parts and materials received from this partner.",
        icon: <Building2 className="text-indigo-600" size={36} />,
      };
    }
    return {
      title: "Stock Journal",
      subtitle: "Comprehensive audit trail of inventory movements.",
      icon: <History className="text-indigo-600" size={36} />,
    };
  }, [itemId, supplierId, targetItem, targetSupplier]);

  const handleResetDates = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    setStartDate(`${year}-${month}-01`);
    setEndDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-6 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate(-1)}
            className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-900 hover:border-slate-300 hover:shadow-md transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              {pageHeader.icon}
              {pageHeader.title}
            </h1>
            <p className="text-slate-500 font-bold mt-1 ml-1">
              {pageHeader.subtitle}
            </p>
          </div>
        </div>

        {/* Date Filter Toolbar */}
        <div className="flex items-center bg-white p-2 rounded-2xl border border-slate-200 shadow-sm self-start md:self-center">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
          />
          <div className="w-px h-6 bg-slate-200 mx-2"></div>
          <button
            onClick={handleResetDates}
            className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all"
            title="Reset to current month"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/40 overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="p-24 text-center flex flex-col items-center justify-center h-full">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mb-4" />
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">
              Loading Records...
            </p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-24 text-center flex flex-col items-center justify-center h-full">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mb-6">
              {supplierId ? <Truck size={40} /> : <History size={40} />}
            </div>
            <h3 className="text-2xl font-black text-slate-900">
              No Records Found
            </h3>
            <p className="text-slate-400 font-medium mt-2 max-w-sm">
              Try adjusting your date range or filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                    Date
                  </th>
                  <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                    Item Details
                  </th>
                  <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                    Quantity
                  </th>
                  <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                    Context
                  </th>
                  <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                    Logged By
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="group hover:bg-slate-50/50 transition-colors"
                  >
                    {/* Date Column */}
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-100 rounded-2xl text-slate-400">
                          <Calendar size={20} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-slate-900 font-bold text-sm">
                            {new Date(log.createdAt).toLocaleDateString()}
                          </span>
                          <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                            {new Date(log.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Item Column */}
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-indigo-600">
                          <Package size={20} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">
                            {log.inventoryItem?.name || "Unknown Item"}
                          </div>
                          <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mt-0.5">
                            Ref: {log.id.slice(0, 6)}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Quantity */}
                    <td className="px-8 py-6">
                      <div className="flex flex-col items-start gap-1">
                        <div
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-black border ${log.change > 0
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                              : "bg-rose-50 text-rose-600 border-rose-100"
                            }`}
                        >
                          {log.change > 0 ? (
                            <ArrowDownRight size={16} />
                          ) : (
                            <ArrowUpRight size={16} />
                          )}
                          {log.change > 0 ? "+" : ""}
                          {log.change}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 px-1 ml-1">
                          Balance: {log.newStock}
                        </div>
                      </div>
                    </td>

                    {/* Context / Supplier */}
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-3 items-start">
                        <span
                          className={`text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border ${log.reason === "STOCK_IN"
                              ? "bg-blue-50 text-blue-600 border-blue-100"
                              : log.reason === "ADJUSTMENT"
                                ? "bg-amber-50 text-amber-600 border-amber-100"
                                : "bg-slate-50 text-slate-500 border-slate-100"
                            }`}
                        >
                          {log.reason.replace("_", " ")}
                        </span>

                        {log.supplier && !supplierId && (
                          <div className="flex items-center gap-2 text-slate-500">
                            <Truck size={14} />
                            <span className="text-xs font-bold">
                              {log.supplier.name}
                            </span>
                          </div>
                        )}

                        {log.remarks && (
                          <div className="flex items-start gap-2 text-slate-400 max-w-[200px]">
                            <AlertCircle
                              size={14}
                              className="mt-0.5 shrink-0 text-slate-300"
                            />
                            <span className="text-[11px] font-medium italic leading-snug">
                              "{log.remarks}"
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* User */}
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3 pl-1">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-black shadow-sm">
                          {log.performer?.name?.charAt(0) || "S"}
                        </div>
                        <span className="text-sm font-bold text-slate-600">
                          {log.performer?.name || "System"}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
