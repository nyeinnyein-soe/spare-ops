import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Building, ShoppingBag, FileSpreadsheet, Loader2 } from "lucide-react";
import { db } from "../services/dbService";
import { Merchant, Shop } from "../types";
import { useData } from "../contexts/DataContext";
import ExcelJS from "exceljs";


export default function Merchants() {
    const [merchants, setMerchants] = useState<Merchant[]>([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useData();


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
        } catch (error) {
            console.error("Failed to fetch merchants", error);
        } finally {
            setLoading(false);
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
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Building className="w-8 h-8 text-indigo-600" />
                    Merchants & Shops
                </h1>
                <div className="flex gap-3">
                    <label className={`flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer transition-all ${importLoading ? "opacity-50 pointer-events-none" : ""}`}>
                        {importLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                        {importLoading ? "Importing..." : "Bulk Import Excel"}
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
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        <Plus className="w-4 h-4" /> Add Merchant
                    </button>
                </div>
            </div>


            <div className="grid gap-6">
                {merchants.map((merchant) => (
                    <div key={merchant.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">{merchant.name}</h3>
                                <p className="text-sm text-gray-500">Code: {merchant.code}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => openMerchantModal(merchant)} className="p-2 text-gray-400 hover:text-indigo-600">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteMerchant(merchant.id)} className="p-2 text-gray-400 hover:text-red-600">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="pl-4 border-l-2 border-gray-100 ml-2 space-y-3">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                    <ShoppingBag className="w-4 h-4" /> Associated Shops
                                </span>
                                <button
                                    onClick={() => openShopModal(merchant.id)}
                                    className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
                                >
                                    <Plus className="w-3 h-3" /> Add Shop
                                </button>
                            </div>

                            {merchant.shops && merchant.shops.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {merchant.shops.map((shop) => (
                                        <div key={shop.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                            <div className="text-sm">
                                                <p className="font-medium text-gray-900">{shop.name}</p>
                                                <p className="text-xs text-gray-500">{shop.code}</p>
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => openShopModal(merchant.id, shop)} className="p-1 text-gray-400 hover:text-indigo-600">
                                                    <Edit2 className="w-3 h-3" />
                                                </button>
                                                <button onClick={() => handleDeleteShop(shop.id)} className="p-1 text-gray-400 hover:text-red-600">
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 italic">No shops added yet.</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Merchant Modal */}
            {showMerchantModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold mb-4">{editingMerchant ? "Edit Merchant" : "New Merchant"}</h2>
                        <form onSubmit={handleSaveMerchant} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Merchant Code</label>
                                <input
                                    required
                                    value={merchantForm.code}
                                    onChange={(e) => setMerchantForm({ ...merchantForm, code: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Merchant Name</label>
                                <input
                                    required
                                    value={merchantForm.name}
                                    onChange={(e) => setMerchantForm({ ...merchantForm, name: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setShowMerchantModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                                    Save Merchant
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Shop Modal */}
            {showShopModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold mb-4">{editingShop ? "Edit Shop" : "New Shop"}</h2>
                        <form onSubmit={handleSaveShop} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Shop Code</label>
                                <input
                                    required
                                    value={shopForm.code}
                                    onChange={(e) => setShopForm({ ...shopForm, code: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name</label>
                                <input
                                    required
                                    value={shopForm.name}
                                    onChange={(e) => setShopForm({ ...shopForm, name: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setShowShopModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
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
