import { useState, useEffect, useMemo } from "react";
import { Plus, Edit2, Trash2, Building, ShoppingBag, FileSpreadsheet, Loader2, Search, ChevronDown, ChevronRight, FilterX } from "lucide-react";
import { db } from "../services/dbService";
import { Merchant, Shop } from "../types";
import { useData } from "../contexts/DataContext";
import ExcelJS from "exceljs";

export default function Merchants() {
    const [merchants, setMerchants] = useState<Merchant[]>([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useData();

    // UI state
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedMerchants, setExpandedMerchants] = useState<Record<string, boolean>>({});

    // Merchant Form State
    const [showMerchantModal, setShowMerchantModal] = useState(false);
    const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
    const [merchantForm, setMerchantForm] = useState({ code: "", name: "" });

    // Shop Form State
    const [showShopModal, setShowShopModal] = useState(false);
    const [editingShop, setEditingShop] = useState<Shop | null>(null);
    const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null);
    const [shopForm, setShopForm] = useState({ code: "", name: "" });

    const [importLoading, setImportLoading] = useState(false);

    useEffect(() => {
        fetchMerchants();
    }, []);

    const fetchMerchants = async () => {
        try {
            const data = await db.merchants.select();
            setMerchants(data);

            // Expand first merchant by default if exists
            if (data.length > 0 && Object.keys(expandedMerchants).length === 0) {
                setExpandedMerchants({ [data[0].id]: true });
            }
        } catch (error) {
            console.error("Failed to fetch merchants", error);
        } finally {
            setLoading(false);
        }
    };

    // Filtered Merchants based on Search Query
    const filteredMerchants = useMemo(() => {
        if (!searchQuery.trim()) return merchants;

        const query = searchQuery.toLowerCase();
        return merchants.map(merchant => {
            const merchantNameMatch = merchant.name.toLowerCase().includes(query);
            const merchantCodeMatch = String(merchant.code).toLowerCase().includes(query);
            const merchantMatch = merchantNameMatch || merchantCodeMatch;

            const matchingShops = (merchant.shops || []).filter(shop =>
                shop.name.toLowerCase().includes(query) ||
                String(shop.code).toLowerCase().includes(query)
            );

            if (merchantMatch || matchingShops.length > 0) {
                return {
                    ...merchant,
                    // Show only matching shops if some shops match, otherwise show all if merchant name/code matches
                    shops: matchingShops.length > 0 ? matchingShops : merchant.shops
                };
            }
            return null;
        }).filter(Boolean) as Merchant[];
    }, [merchants, searchQuery]);

    const toggleMerchant = (id: string) => {
        setExpandedMerchants(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleAll = (expand: boolean) => {
        if (expand) {
            const all = filteredMerchants.reduce((acc, m) => ({ ...acc, [m.id]: true }), {});
            setExpandedMerchants(all);
        } else {
            setExpandedMerchants({});
        }
    };

    const handleSaveMerchant = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingMerchant) {
                await db.merchants.update(editingMerchant.id, merchantForm);
            } else {
                await db.merchants.insert(merchantForm);
            }
            setShowMerchantModal(false);
            showToast(editingMerchant ? "Merchant updated successfully" : "Merchant created successfully", "success");
            fetchMerchants();
        } catch (error) {
            showToast("Failed to save merchant", "error");
        }
    };

    const handleDeleteMerchant = async (id: string) => {
        if (!confirm("Are you sure? This will delete all shops associated with this merchant.")) return;
        try {
            await db.merchants.delete(id);
            showToast("Merchant deleted", "success");
            fetchMerchants();
        } catch (error) {
            showToast("Failed to delete merchant", "error");
        }
    };

    const handleSaveShop = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMerchantId) return;

        try {
            if (editingShop) {
                await db.shops.update(editingShop.id, { ...shopForm, merchantId: selectedMerchantId });
            } else {
                await db.shops.insert({ ...shopForm, merchantId: selectedMerchantId });
            }
            setShowShopModal(false);
            showToast(editingShop ? "Shop updated successfully" : "Shop created successfully", "success");
            fetchMerchants(); // Refresh to show nested shops
        } catch (error) {
            showToast("Failed to save shop", "error");
        }
    };

    const handleDeleteShop = async (id: string) => {
        if (!confirm("Are you sure you want to delete this shop?")) return;
        try {
            await db.shops.delete(id);
            showToast("Shop deleted", "success");
            fetchMerchants();
        } catch (error) {
            showToast("Failed to delete shop", "error");
        }
    };

    const openMerchantModal = (merchant?: Merchant) => {
        setEditingMerchant(merchant || null);
        setMerchantForm(merchant ? { code: merchant.code, name: merchant.name } : { code: "", name: "" });
        setShowMerchantModal(true);
    };

    const openShopModal = (merchantId: string, shop?: Shop) => {
        setSelectedMerchantId(merchantId);
        setEditingShop(shop || null);
        setShopForm(shop ? { code: shop.code, name: shop.name } : { code: "", name: "" });
        setShowShopModal(true);
    };

    const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportLoading(true);
        try {
            const workbook = new ExcelJS.Workbook();
            const buffer = await file.arrayBuffer();
            await workbook.xlsx.load(buffer);

            const allData: any[] = [];

            workbook.eachSheet((sheet) => {
                console.log(`Processing sheet: "${sheet.name}"`);
                // 1. Find the header row (scan first 20 rows)
                let headerRowLine = -1;
                let merchantCodeIdx = -1;
                let merchantNameIdx = -1;
                let shopCodeIdx = -1;
                let shopNameIdx = -1;

                for (let r = 1; r <= Math.min(sheet.rowCount, 20); r++) {
                    const row = sheet.getRow(r);
                    let foundMerchantCode = false;

                    row.eachCell((cell, colNumber) => {
                        const val = cell.value?.toString().toLowerCase().trim();
                        if (val === "merchant code") {
                            merchantCodeIdx = colNumber;
                            foundMerchantCode = true;
                        }
                        if (val === "merchant name") merchantNameIdx = colNumber;
                        if (val === "shop code") shopCodeIdx = colNumber;
                        if (val === "shop name") shopNameIdx = colNumber;
                    });

                    if (foundMerchantCode && merchantNameIdx !== -1 && shopCodeIdx !== -1 && shopNameIdx !== -1) {
                        headerRowLine = r;
                        break;
                    }
                }

                if (headerRowLine === -1) {
                    console.warn(`Sheet "${sheet.name}" missing required headers. Skipping.`);
                    return;
                }

                console.log(`Found headers at row ${headerRowLine} in sheet "${sheet.name}"`);

                // 2. Process data rows starting after the header
                let rowsProcessed = 0;
                for (let rowNum = headerRowLine + 1; rowNum <= sheet.rowCount; rowNum++) {
                    const row = sheet.getRow(rowNum);

                    const getVal = (idx: number) => {
                        const cell = row.getCell(idx);
                        if (!cell.value) return "";

                        // Handle potential object types (e.g., formula or styled cell)
                        if (typeof cell.value === 'object' && cell.value !== null) {
                            if ('text' in cell.value) return cell.value.text?.toString().trim() || "";
                            if ('result' in cell.value) return cell.value.result?.toString().trim() || "";
                        }
                        return cell.value.toString().trim();
                    };

                    const merchantCode = getVal(merchantCodeIdx);
                    const merchantName = getVal(merchantNameIdx);
                    const shopCode = getVal(shopCodeIdx);
                    const shopName = getVal(shopNameIdx);

                    if (merchantCode && merchantName && shopCode && shopName) {
                        allData.push({ merchantCode, merchantName, shopCode, shopName });
                        rowsProcessed++;
                    }
                }
                console.log(`Added ${rowsProcessed} rows from sheet "${sheet.name}"`);
            });

            if (allData.length === 0) {
                showToast("No valid data found in the Excel file", "error");
                return;
            }

            await db.merchants.bulkInsert(allData);
            showToast(`Successfully imported ${allData.length} records`, "success");
            fetchMerchants();
        } catch (error: any) {
            console.error("Excel import failed", error);
            const errorMsg = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
            if (errorMsg.includes("Invalid token")) {
                showToast("Session expired. Please re-login", "error");
            } else {
                showToast(`Import failed: ${errorMsg}`, "error");
            }
        } finally {
            setImportLoading(false);
            e.target.value = ""; // Clear file input
        }
    };


    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-8 space-y-8 animate-in fade-in duration-500">
            {/* Page Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-1 bg-indigo-600 rounded-full" />
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                        Merchants & Shops
                    </h1>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <label className={`flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 cursor-pointer shadow-lg shadow-emerald-100 transition-all ${importLoading ? "opacity-50 pointer-events-none" : ""}`}>
                        {importLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                        {importLoading ? "Importing..." : "Bulk Import"}
                        <input
                            type="file"
                            accept=".xlsx"
                            className="hidden"
                            onChange={handleExcelImport}
                            disabled={importLoading}
                        />
                    </label>
                    <button
                        onClick={() => openMerchantModal()}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
                    >
                        <Plus className="w-4 h-4" /> Add Merchant
                    </button>
                </div>
            </div>

            {/* Sticky Search Section */}
            <div className="sticky top-0 z-20 -mx-6 md:-mx-10 px-6 md:px-10 py-4 bg-slate-50 border-b border-slate-200">

                {/* Sub-Header with Search and Controls */}
                <div className="flex flex-col sm:flex-row items-center gap-4 mt-6">
                    <div className="relative flex-1 flex items-center group bg-white border border-slate-200 rounded-2xl shadow-sm focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all">
                        <div className="pl-4 pr-2 text-slate-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none">
                            <Search size={20} />
                        </div>
                        <input
                            type="text"
                            placeholder="Find merchants or shops (name or code)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 py-3 bg-transparent border-none text-sm font-medium focus:outline-none placeholder:text-slate-400"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="pr-4 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2 shrink-0">
                        <button
                            onClick={() => toggleAll(true)}
                            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-colors"
                        >
                            Expand All
                        </button>
                        <button
                            onClick={() => toggleAll(false)}
                            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-colors"
                        >
                            Collapse All
                        </button>
                    </div>
                </div>
            </div>

            {filteredMerchants.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-4 bg-white rounded-3xl border border-dashed border-slate-200">
                    <FilterX size={48} className="opacity-20" />
                    <p className="font-medium text-slate-500">No merchants found matching your search</p>
                    <button onClick={() => setSearchQuery("")} className="text-sm font-bold text-indigo-600 hover:underline">Clear search filters</button>
                </div>
            ) : (
                <div className="grid gap-6">
                    {filteredMerchants.map((merchant) => (
                        <div key={merchant.id} className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
                            {/* Merchant Header / Toggle */}
                            <div className="p-6">
                                <div className="flex items-start justify-between">
                                    <div
                                        className="flex items-center gap-4 cursor-pointer group flex-1"
                                        onClick={() => toggleMerchant(merchant.id)}
                                    >
                                        <div className={`p-3 rounded-2xl transition-colors ${expandedMerchants[merchant.id] ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600"}`}>
                                            {expandedMerchants[merchant.id] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">{merchant.name}</h3>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{merchant.code}</span>
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                                                <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-full">{merchant.shops?.length || 0} Associated Shops</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => openMerchantModal(merchant)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => handleDeleteMerchant(merchant.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Content: Shops */}
                            {expandedMerchants[merchant.id] && (
                                <div className="px-6 pb-6 pt-2 border-t border-slate-50 bg-slate-50/10">
                                    <div className="flex justify-between items-center mb-6">
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <ShoppingBag className="w-4 h-4" /> Shop List
                                        </span>
                                        <button
                                            onClick={() => openShopModal(merchant.id)}
                                            className="px-4 py-2 bg-white border border-slate-200 text-indigo-600 font-bold text-xs rounded-xl hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all flex items-center gap-2"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Add New Shop
                                        </button>
                                    </div>

                                    {merchant.shops && merchant.shops.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {merchant.shops.map((shop) => (
                                                <div key={shop.id} className="relative group bg-white border border-slate-200 rounded-2xl p-4 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all">
                                                    <div className="flex justify-between items-start">
                                                        <div className="overflow-hidden">
                                                            <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{shop.name}</p>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{shop.code}</p>
                                                        </div>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => openShopModal(merchant.id, shop)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg">
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button onClick={() => handleDeleteShop(shop.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-10 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                                            <p className="text-sm font-medium text-slate-400 italic">No shops associated with this merchant yet.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Merchant Modal */}
            {showMerchantModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] max-w-md w-full p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                        <h2 className="text-2xl font-black text-slate-900 mb-6">{editingMerchant ? "Edit Merchant" : "New Merchant"}</h2>
                        <form onSubmit={handleSaveMerchant} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Merchant Code</label>
                                <input
                                    required
                                    value={merchantForm.code}
                                    onChange={(e) => setMerchantForm({ ...merchantForm, code: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Merchant Name</label>
                                <input
                                    required
                                    value={merchantForm.name}
                                    onChange={(e) => setMerchantForm({ ...merchantForm, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-8">
                                <button type="button" onClick={() => setShowMerchantModal(false)} className="px-6 py-3 text-slate-600 font-bold text-sm hover:bg-slate-50 rounded-2xl transition-all">
                                    Cancel
                                </button>
                                <button type="submit" className="px-8 py-3 bg-indigo-600 text-white font-black text-sm rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all">
                                    Save Merchant
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Shop Modal */}
            {showShopModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] max-w-md w-full p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                        <h2 className="text-2xl font-black text-slate-900 mb-6">{editingShop ? "Edit Shop" : "New Shop"}</h2>
                        <form onSubmit={handleSaveShop} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Shop Code</label>
                                <input
                                    required
                                    value={shopForm.code}
                                    onChange={(e) => setShopForm({ ...shopForm, code: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Shop Name</label>
                                <input
                                    required
                                    value={shopForm.name}
                                    onChange={(e) => setShopForm({ ...shopForm, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-8">
                                <button type="button" onClick={() => setShowShopModal(false)} className="px-6 py-3 text-slate-600 font-bold text-sm hover:bg-slate-50 rounded-2xl transition-all">
                                    Cancel
                                </button>
                                <button type="submit" className="px-8 py-3 bg-indigo-600 text-white font-black text-sm rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all">
                                    Save Shop
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function X({ size }: { size: number }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
    );
}

