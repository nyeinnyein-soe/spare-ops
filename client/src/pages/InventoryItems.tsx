import React, { useState, useEffect, useMemo } from "react";
import {
  PlusCircle,
  X,
  Package,
  History,
  Plus,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Filter,
  Search,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useData } from "../contexts/DataContext";
import { db } from "../services/dbService";
import { InventoryItem, Supplier } from "../types";

export default function InventoryItems() {
  const { inventoryItems, refreshData } = useData();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  const [stockActionModal, setStockActionModal] = useState<{
    isOpen: boolean;
    item: InventoryItem | null;
    action: "STOCK_IN" | "ADJUSTMENT";
    amount: number;
    remarks: string;
    supplierId: string;
  }>({
    isOpen: false,
    item: null,
    action: "STOCK_IN",
    amount: 0,
    remarks: "",
    supplierId: "",
  });

  useEffect(() => {
    db.suppliers.getAll().then(setSuppliers);
  }, []);

  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const filteredItems = useMemo(() => {
    return inventoryItems.filter(
      (item) => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.id.toLowerCase().includes(searchTerm.toLowerCase());
        const isLowStock = item.currentStock <= 10;
        return matchesSearch && (!showLowStockOnly || isLowStock);
      }
    );
  }, [inventoryItems, searchTerm, showLowStockOnly]);

  const openModal = (item?: InventoryItem) => {
    // ... existing code ...
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({ name: "", description: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    try {
      if (editingItem) {
        await db.inventory.update(editingItem.id, formData);
      } else {
        await db.inventory.insert(formData);
      }
      refreshData();
      closeModal();
    } catch (error) {
      alert("Operation failed.");
    }
  };

  const stats = useMemo(
    () => ({
      total: inventoryItems.length,
      inStock: inventoryItems.filter((i) => i.currentStock > 10).length,
      lowStock: inventoryItems.filter(
        (i) => i.currentStock > 0 && i.currentStock <= 10,
      ).length,
      outOfStock: inventoryItems.filter((i) => i.currentStock === 0).length,
    }),
    [inventoryItems],
  );

  return (
    <div className="min-h-full pb-20">
      <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-8">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm uppercase tracking-[0.2em] mb-2">
              <div className="w-8 h-[2px] bg-indigo-600 rounded-full" />
              Stock Central
            </div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-none">
              Inventory
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
                placeholder="Search by part name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl w-full md:w-[320px] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-medium text-slate-600 shadow-sm"
              />
            </div>
            <button
              onClick={() => openModal()}
              className="bg-slate-900 hover:bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-sm flex items-center gap-3 transition-all shadow-xl shadow-slate-200 active:scale-95 hover:-translate-y-1"
            >
              <PlusCircle size={20} /> Add New Part
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard
            label="Total Parts"
            value={stats.total}
            icon={<Package />}
            color="text-blue-600"
            bgColor="bg-blue-50"
          />
          <SummaryCard
            label="Healthy Stock"
            value={stats.inStock}
            icon={<CheckCircle2 />}
            color="text-emerald-600"
            bgColor="bg-emerald-50"
          />
          <SummaryCard
            label="Low Inventory"
            value={stats.lowStock}
            icon={<AlertCircle />}
            color="text-amber-600"
            bgColor="bg-amber-50"
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            active={showLowStockOnly}
          />
          <SummaryCard
            label="Stock-outs"
            value={stats.outOfStock}
            icon={<Trash2 />}
            color="text-rose-600"
            bgColor="bg-rose-50"
          />
        </section>

        <main className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/40 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                <Filter size={18} />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                {showLowStockOnly ? "Low Stock alerts" : "Current Stock List"}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              {showLowStockOnly && (
                <button
                  onClick={() => setShowLowStockOnly(false)}
                  className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                >
                  Clear Filters
                </button>
              )}
              <span className="px-4 py-1.5 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {filteredItems.length} Result
                {filteredItems.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    Item Description
                  </th>
                  <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    Current Balance
                  </th>
                  <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    Availability
                  </th>
                  <th className="px-8 py-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    Quick Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="group hover:bg-slate-50/80 transition-all duration-300"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-5">
                        <div className="h-12 w-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-100 group-hover:shadow-md transition-all">
                          <Package size={22} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-base leading-tight group-hover:text-indigo-600 transition-colors">
                            {item.name}
                          </div>
                          <div className="text-[11px] font-medium text-slate-400 mt-1 flex items-center gap-1">
                            <span className="text-indigo-500 font-bold">
                              #{item.id.slice(0, 8)}
                            </span>
                            {item.description && (
                              <span className="truncate max-w-[200px] block">
                                • {item.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-baseline gap-1">
                        <span className="font-black text-slate-900 text-2xl">
                          {item.currentStock}
                        </span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                          Units
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <StatusBadge qty={item.currentStock} />
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() =>
                            setStockActionModal({
                              isOpen: true,
                              item,
                              action: "STOCK_IN",
                              amount: 0,
                              remarks: "",
                              supplierId: "",
                            })
                          }
                          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all font-bold text-xs"
                        >
                          <Plus size={16} /> Add Stock
                        </button>
                        <div className="w-[1px] h-6 bg-slate-100 mx-1" />
                        <Link
                          to={`/stock-journal?itemId=${item.id}`}
                          className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-white hover:text-blue-600 border border-transparent hover:border-slate-200 transition-all shadow-sm"
                          title="Journal History"
                        >
                          <History size={18} />
                        </Link>
                        <button
                          onClick={() => openModal(item)}
                          className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-white hover:text-indigo-600 border border-transparent hover:border-slate-200 transition-all shadow-sm"
                          title="Edit Details"
                        >
                          <ArrowUpRight size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredItems.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4">
                  <Search size={40} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  No parts found
                </h3>
                <p className="text-slate-500 max-w-xs mt-2 font-medium">
                  We couldn't find any items matching "{searchTerm}". Try
                  another keyword.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md animate-in fade-in duration-300"
          onClick={closeModal}
        >
          <div
            className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <div className="w-2 h-8 bg-indigo-600 rounded-full" />
                {editingItem ? "Refine Part Details" : "Register New Part"}
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
                label="Full Part Name"
                value={formData.name}
                onChange={(v) => setFormData({ ...formData, name: v })}
                placeholder="e.g. Variable Displacement Pump"
                required
              />
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">
                  Detailed Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Specifications, compatibility notes, or storage location..."
                  className="w-full p-5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-100 rounded-2xl outline-none transition-all text-slate-700 min-h-[120px] resize-none font-medium leading-relaxed"
                />
              </div>
              <button
                type="submit"
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all mt-4"
              >
                {editingItem ? "Save Changes" : "Confirm Addition"}
              </button>
            </form>
          </div>
        </div>
      )}

      {stockActionModal.isOpen && stockActionModal.item && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/40 animate-in fade-in duration-300"
          onClick={() =>
            setStockActionModal({ ...stockActionModal, isOpen: false })
          }
        >
          <div
            className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                  Stock Transaction
                </h3>
                <p className="text-indigo-600 font-bold mt-2 text-sm flex items-center gap-2">
                  <Package size={14} /> {stockActionModal.item.name}
                </p>
              </div>
              <button
                onClick={() =>
                  setStockActionModal({ ...stockActionModal, isOpen: false })
                }
                className="p-2 text-slate-400 hover:text-rose-500 transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex p-1.5 bg-slate-100 rounded-2xl mb-8">
              {(["STOCK_IN", "ADJUSTMENT"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() =>
                    setStockActionModal({
                      ...stockActionModal,
                      action: a,
                      amount: 0,
                      supplierId: "",
                    })
                  }
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${stockActionModal.action === a
                    ? "bg-white text-indigo-600 shadow-md"
                    : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                  {a === "STOCK_IN" ? "Restock / Arrival" : "Manual Adjustment"}
                </button>
              ))}
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (stockActionModal.item) {
                  await db.inventory.adjust(stockActionModal.item.id, {
                    action: stockActionModal.action,
                    amount: stockActionModal.amount,
                    remarks: stockActionModal.remarks,
                    supplierId: stockActionModal.supplierId || undefined,
                  });
                  refreshData();
                  setStockActionModal({ ...stockActionModal, isOpen: false });
                }
              }}
              className="space-y-6"
            >
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <FloatingInput
                  type="number"
                  label={
                    stockActionModal.action === "ADJUSTMENT"
                      ? "Set New Inventory Total"
                      : "Quantity to Add"
                  }
                  value={String(stockActionModal.amount || "")}
                  onChange={(v) =>
                    setStockActionModal({
                      ...stockActionModal,
                      amount: parseInt(v) || 0,
                    })
                  }
                  placeholder="0"
                  required
                />
                {stockActionModal.action === "STOCK_IN" && (
                  <div className="flex items-center justify-between mt-4 px-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                      Expected Total:
                    </span>
                    <span className="font-black text-indigo-600 text-lg">
                      {stockActionModal.item.currentStock} →{" "}
                      {stockActionModal.item.currentStock +
                        stockActionModal.amount}
                    </span>
                  </div>
                )}
              </div>

              {stockActionModal.action === "STOCK_IN" && (
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">
                    Verified Supplier
                  </label>
                  <select
                    value={stockActionModal.supplierId}
                    onChange={(e) =>
                      setStockActionModal({
                        ...stockActionModal,
                        supplierId: e.target.value,
                      })
                    }
                    required
                    className="w-full p-5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-100 rounded-2xl outline-none transition-all text-slate-700 font-bold appearance-none cursor-pointer"
                  >
                    <option value="" disabled>
                      Select Source...
                    </option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Remarks/Reference Note is now optional */}
              <FloatingInput
                label="Reference Note (Optional)"
                value={stockActionModal.remarks}
                onChange={(v) =>
                  setStockActionModal({ ...stockActionModal, remarks: v })
                }
                placeholder="PO #, Batch Code, or Adjustment reason..."
              />

              <button
                type="submit"
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-[0.98] transition-all"
              >
                Finalize{" "}
                {stockActionModal.action === "STOCK_IN"
                  ? "Restock"
                  : "Adjustment"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  color,
  bgColor,
  onClick,
  active,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`p-6 rounded-3xl border transition-all duration-300 bg-white shadow-xl shadow-slate-200/50 flex items-center gap-6 group hover:-translate-y-1 ${onClick ? "cursor-pointer" : ""} ${active ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-white"}`}
    >
      <div
        className={`h-14 w-14 rounded-2xl ${bgColor} ${color} flex items-center justify-center transition-transform group-hover:scale-110`}
      >
        {React.cloneElement(icon as React.ReactElement<any>, { size: 26 })}
      </div>
      <div>
        <div className="text-3xl font-black text-slate-900 leading-none mb-1">
          {value}
        </div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
          {label}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ qty }: { qty: number }) {
  const config =
    qty > 10
      ? {
        text: "Optimal",
        bg: "bg-emerald-50",
        textCol: "text-emerald-600",
        border: "border-emerald-100",
        dot: "bg-emerald-500",
      }
      : qty > 0
        ? {
          text: "Critical Low",
          bg: "bg-amber-50",
          textCol: "text-amber-600",
          border: "border-amber-100",
          dot: "bg-amber-500",
        }
        : {
          text: "Out of Stock",
          bg: "bg-rose-50",
          textCol: "text-rose-600",
          border: "border-rose-100",
          dot: "bg-rose-500",
        };

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bg} ${config.textCol} text-[10px] font-black uppercase tracking-widest border ${config.border}`}
    >
      <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${config.dot}`} />
      {config.text}
    </div>
  );
}

function FloatingInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: any) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full p-5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-100 rounded-2xl outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300"
      />
    </div>
  );
}
