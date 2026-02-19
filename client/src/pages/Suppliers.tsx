import React, { useState, useEffect, useMemo } from "react";
import {
  PlusCircle,
  X,
  Search,
  Edit2,
  Trash2,
  MapPin,
  Building2,
  Phone,
  Mail,
  TrendingUp,
  Clock,
  ExternalLink,
  Calendar,
  MoreHorizontal,
} from "lucide-react";
import { Link } from "react-router-dom";
import { db } from "../services/dbService";
import { Supplier, StockLog } from "../types";
import { useData } from "../contexts/DataContext";

// Helper to format "2 days ago"
const timeAgo = (dateStr: string | Date) => {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 2592000) {
    // Less than 30 days
    const days = Math.floor(seconds / 86400);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function Suppliers() {
  const { refreshData } = useData();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [logs, setLogs] = useState<StockLog[]>([]); // We need logs to calculate usefulness
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    address: "",
  });

  // Fetch Suppliers AND Logs to compute intelligence
  const fetchData = async () => {
    try {
      const [suppliersData, logsData] = await Promise.all([
        db.suppliers.getAll(),
        db.inventory.getStockLogs(), // Assuming this fetches all logs
      ]);
      setSuppliers(suppliersData);
      setLogs(logsData);
    } catch (error) {
      console.error("Failed to fetch data");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- PRODUCTION INTELLIGENCE LOGIC ---
  const supplierStats = useMemo(() => {
    // 1. Map logs to suppliers to find "Last Active" and "Total Transactions"
    const statsMap = new Map<string, { count: number; lastActive: Date }>();

    logs.forEach((log) => {
      if (log.supplierId) {
        const current = statsMap.get(log.supplierId) || {
          count: 0,
          lastActive: new Date(0),
        };
        const logDate = new Date(log.createdAt);
        statsMap.set(log.supplierId, {
          count: current.count + 1,
          lastActive:
            logDate > current.lastActive ? logDate : current.lastActive,
        });
      }
    });

    // 2. Calculate Top Level Metrics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeInLast30Days = Array.from(statsMap.values()).filter(
      (s) => s.lastActive > thirtyDaysAgo,
    ).length;

    // Find Top Supplier by Volume
    let topSupplierId = "";
    let maxTx = 0;
    statsMap.forEach((val, key) => {
      if (val.count > maxTx) {
        maxTx = val.count;
        topSupplierId = key;
      }
    });
    const topSupplierName =
      suppliers.find((s) => s.id === topSupplierId)?.name || "N/A";

    return {
      map: statsMap,
      activeCount: activeInLast30Days,
      topSupplier: { name: topSupplierName, count: maxTx },
    };
  }, [suppliers, logs]);
  // -------------------------------------

  const openModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name,
        contact: supplier.contact || "",
        address: supplier.address || "",
      });
    } else {
      setEditingSupplier(null);
      setFormData({ name: "", contact: "", address: "" });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
    setFormData({ name: "", contact: "", address: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (editingSupplier) {
        await db.suppliers.update(editingSupplier.id, formData);
      } else {
        await db.suppliers.insert(formData);
      }
      fetchData();
      refreshData();
      closeModal();
    } catch (error) {
      alert("Operation failed. Name might be duplicate.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to remove this partner?")) {
      await db.suppliers.delete(id);
      fetchData();
      refreshData();
    }
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [suppliers, searchQuery]);

  return (
    <div className="min-h-full pb-20">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-8">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm uppercase tracking-[0.2em] mb-2">
              <div className="w-8 h-[2px] bg-indigo-600 rounded-full" />
              Procurement
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              Supplier Network
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="relative group">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"
                size={18}
              />
              <input
                type="text"
                placeholder="Search partners..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl w-full md:w-[320px] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-medium text-slate-600 shadow-sm"
              />
            </div>
            <button
              onClick={() => openModal()}
              className="bg-slate-900 hover:bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-sm flex items-center gap-3 transition-all shadow-xl shadow-slate-200 active:scale-95 hover:-translate-y-1"
            >
              <PlusCircle size={20} /> Register Supplier
            </button>
          </div>
        </header>

        {/* USEFUL Stats Section */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            label="Active Partners (30d)"
            value={supplierStats.activeCount}
            subValue={`of ${suppliers.length} total registered`}
            icon={<Clock />}
            color="text-emerald-600"
            bgColor="bg-emerald-50"
          />
          <StatCard
            label="Top Supplier (Volume)"
            value={supplierStats.topSupplier.name}
            isTextValue={true}
            subValue={`${supplierStats.topSupplier.count} transactions recorded`}
            icon={<TrendingUp />}
            color="text-indigo-600"
            bgColor="bg-indigo-50"
          />
          <StatCard
            label="Total Network"
            value={suppliers.length}
            subValue="Managed entities"
            icon={<Building2 />}
            color="text-blue-600"
            bgColor="bg-blue-50"
          />
        </section>

        {/* Supplier Grid */}
        <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSuppliers.map((supplier) => {
            const stats = supplierStats.map.get(supplier.id) || {
              count: 0,
              lastActive: null,
            };
            const isActive =
              stats.lastActive &&
              new Date().getTime() - stats.lastActive.getTime() < 2592000000; // 30 days

            return (
              <div
                key={supplier.id}
                className="group bg-white rounded-[2rem] p-6 border border-slate-100 shadow-lg shadow-slate-200/30 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-100/50 transition-all duration-300 flex flex-col h-full"
              >
                {/* Card Header */}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl font-black text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                      {supplier.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 leading-tight mb-1">
                        {supplier.name}
                      </h3>
                      <div
                        className={`text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border ${isActive ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"}`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`}
                        />
                        {isActive ? "Active" : "Dormant"}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openModal(supplier)}
                      className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(supplier.id)}
                      className="p-2 text-slate-300 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Info Block */}
                <div className="space-y-3 mb-6 flex-grow">
                  <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                    <Mail size={16} className="text-slate-300" />
                    <span className="truncate">
                      {supplier.contact || "No email provided"}
                    </span>
                  </div>
                  <div className="flex items-start gap-3 text-sm font-medium text-slate-500">
                    <MapPin
                      size={16}
                      className="text-slate-300 shrink-0 mt-0.5"
                    />
                    <span className="line-clamp-2 leading-snug">
                      {supplier.address || "No HQ address"}
                    </span>
                  </div>
                </div>

                {/* Footer Metrics */}
                <div className="pt-4 border-t border-slate-50 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      Total Deals
                    </div>
                    <div className="text-lg font-black text-slate-900">
                      {stats.count}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      Last Activity
                    </div>
                    <div className="text-sm font-bold text-slate-700 flex items-center gap-1">
                      {stats.lastActive ? timeAgo(stats.lastActive) : "Never"}
                    </div>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                  <Link
                    to={`/stock-journal?supplierId=${supplier.id}`}
                    className="flex items-center gap-2 text-xs font-black text-indigo-600 uppercase tracking-wider hover:underline"
                  >
                    Transaction Log <ExternalLink size={12} />
                  </Link>

                  {/* Quick Actions (Mock) */}
                  <div className="flex gap-2">
                    <a
                      href={`mailto:${supplier.contact}`}
                      className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    >
                      <Mail size={14} />
                    </a>
                    <button className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors">
                      <Phone size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </main>
      </div>

      {/* Modal Code remains largely the same, just styled for consistency */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md animate-in fade-in duration-300"
          onClick={closeModal}
        >
          <div
            className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <div className="w-2 h-8 bg-indigo-600 rounded-full" />
                {editingSupplier ? "Edit Partner" : "New Supplier"}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <FloatingInput
                label="Company Name"
                value={formData.name}
                onChange={(v) => setFormData({ ...formData, name: v })}
                placeholder="e.g. Apex Industrial Supply"
                required
              />
              <FloatingInput
                label="Primary Contact"
                value={formData.contact}
                onChange={(v) => setFormData({ ...formData, contact: v })}
                placeholder="Email or Phone Number"
              />
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">
                  Headquarters Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Street, City, Postal Code..."
                  className="w-full p-5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-100 rounded-2xl outline-none transition-all text-slate-700 min-h-[120px] resize-none font-medium leading-relaxed"
                />
              </div>
              <button
                type="submit"
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all mt-4"
              >
                {editingSupplier ? "Save Changes" : "Register Partner"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  subValue,
  icon,
  color,
  bgColor,
  isTextValue = false,
}: any) {
  return (
    <div className="p-6 rounded-3xl border border-white transition-all duration-300 bg-white shadow-xl shadow-slate-200/50 flex items-center gap-6 group hover:-translate-y-1">
      <div
        className={`h-14 w-14 rounded-2xl ${bgColor} ${color} flex items-center justify-center transition-transform group-hover:scale-110`}
      >
        {React.cloneElement(icon as React.ReactElement<any>, { size: 26 })}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={`${isTextValue ? "text-xl" : "text-3xl"} font-black text-slate-900 leading-none mb-1 truncate`}
        >
          {value}
        </div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-0.5">
          {label}
        </div>
        {subValue && (
          <div className="text-[10px] font-bold text-slate-400 truncate">
            {subValue}
          </div>
        )}
      </div>
    </div>
  );
}

function FloatingInput({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: any) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full p-5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-100 rounded-2xl outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300"
      />
    </div>
  );
}
