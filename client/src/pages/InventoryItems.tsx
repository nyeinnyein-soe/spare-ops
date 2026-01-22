import React, { useState } from "react";
import {
  PlusCircle,
  Edit2,
  Archive,
  ArchiveRestore,
  X,
  Package,
} from "lucide-react";
import { useData } from "../contexts/DataContext";
import { db } from "../services/dbService";
import { InventoryItem } from "../types";

export default function InventoryItems() {
  const { inventoryItems, refreshData } = useData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  const openModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({ name: item.name, description: item.description || "" });
    } else {
      setEditingItem(null);
      setFormData({ name: "", description: "" });
    }
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
      alert("Operation failed. Name might be duplicate.");
    }
  };

  const toggleArchive = async (id: string) => {
    await db.inventory.toggleArchive(id);
    refreshData();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Spare Parts</h2>
          <p className="text-slate-400 text-sm">Manage inventory catalog</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg active:scale-95"
        >
          <PlusCircle size={18} /> Add New Part
        </button>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={closeModal}
        >
          <div
            className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">
                {editingItem ? "Edit Part" : "New Part"}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Part Name
                </label>
                <input
                  autoFocus
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. Micro Cable"
                  className="w-full p-4 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-bold text-slate-700"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Optional details..."
                  className="w-full p-4 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-600 min-h-[100px] resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  {editingItem ? "Save Changes" : "Create Part"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {inventoryItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400 italic">
            No parts found. Click "Add New Part" to start.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {inventoryItems.map((item) => (
              <div
                key={item.id}
                className={`p-6 flex justify-between items-center group hover:bg-slate-50 transition-colors ${item.isArchived ? "bg-slate-50 opacity-60 grayscale" : ""}`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`h-12 w-12 rounded-2xl flex items-center justify-center ${item.isArchived ? "bg-slate-200 text-slate-400" : "bg-indigo-50 text-indigo-600"}`}
                  >
                    <Package size={24} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-lg">
                      {item.name}
                    </div>
                    {item.description && (
                      <div className="text-sm text-slate-500">
                        {item.description}
                      </div>
                    )}
                    {item.isArchived && (
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Archived
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openModal(item)}
                    className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-xl transition-all"
                    title="Edit"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => toggleArchive(item.id)}
                    className={`p-3 border border-transparent hover:border-slate-200 rounded-xl transition-all ${item.isArchived ? "text-emerald-600 hover:bg-emerald-50" : "text-rose-500 hover:bg-rose-50"}`}
                    title={item.isArchived ? "Restore" : "Archive"}
                  >
                    {item.isArchived ? (
                      <ArchiveRestore size={18} />
                    ) : (
                      <Archive size={18} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
