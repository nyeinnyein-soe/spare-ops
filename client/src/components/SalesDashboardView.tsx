import { useState, useRef, useMemo, useEffect } from "react";
import {
  Package,
  ArrowRightLeft,
  Store,
  Camera,
  CheckCircle,
} from "lucide-react";
import { db } from "../services/dbService";
import { RequestStatus, Shop } from "../types";
import { useAuth } from "../contexts/AuthContext";
import SearchableSelect from "./SearchableSelect";
import { compressToWebP } from "../utils/imageUtils";

export default function SalesDashboardView({
  requests,
  usages,
  onRefresh,
}: any) {
  const { currentUser } = useAuth();
  const approved = requests.filter(
    (r: any) => r.status === RequestStatus.APPROVED,
  );

  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState("");

  useEffect(() => {
    // Fetch shops for dropdown
    db.shops.select().then(setShops).catch(console.error);
  }, []);

  const shopOptions = useMemo(() => {
    return shops.map(s => ({
      value: s.id,
      label: s.name,
      sublabel: `Code: ${s.code}`
    }));
  }, [shops]);

  // Store the ID of the selected part, not the name
  const [selectedItemId, setSelectedItemId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [img, setImg] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // --- 1. FIXED INVENTORY CALCULATION ---
  const onHand = useMemo(() => {
    if (!currentUser) return [];

    // Dictionary to store counts: { [itemId]: { name: string, qty: number } }
    const counts: Record<string, { name: string; quantity: number }> = {};

    // A. Add Received Items
    requests
      .filter(
        (r: any) =>
          r.status === RequestStatus.RECEIVED &&
          r.requesterId === currentUser.id,
      )
      .forEach((r: any) => {
        r.items.forEach((i: any) => {
          if (!counts[i.inventoryItemId]) {
            counts[i.inventoryItemId] = { name: i.type, quantity: 0 };
          }
          counts[i.inventoryItemId].quantity += i.quantity;
        });
      });

    // B. Subtract Used Items
    usages
      .filter((u: any) => u.salespersonId === currentUser.id)
      .forEach((u: any) => {
        if (counts[u.inventoryItemId]) {
          counts[u.inventoryItemId].quantity -= 1;
        }
      });

    // Convert back to array and filter out 0 quantity
    return Object.entries(counts)
      .filter(([_, data]) => data.quantity > 0)
      .map(([id, data]) => ({
        id: id,
        name: data.name,
        quantity: data.quantity,
      }));
  }, [requests, usages, currentUser]);

  const spareOptions = useMemo(() => {
    return onHand.map(i => ({
      value: i.id,
      label: i.name,
      sublabel: `On Hand: ${i.quantity}`
    }));
  }, [onHand]);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      try {
        setIsCompressing(true);
        const compressedBase64 = await compressToWebP(file);
        setImg(compressedBase64);
      } catch (error) {
        console.error("Compression failed:", error);
        // Fallback to original if compression fails (though we should avoid this if possible)
        const reader = new FileReader();
        reader.onloadend = () => setImg(reader.result as string);
        reader.readAsDataURL(file);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleLogUsage = async () => {
    if (!selectedItemId) return;

    // --- 2. SEND CORRECT PAYLOAD ---
    await db.usages.insert({
      shopId: selectedShopId,
      inventoryItemId: selectedItemId, // Send the UUID
      salespersonId: currentUser!.id,
      remarks: remarks || undefined,
      voucherImage: img || undefined,
    });

    setSelectedShopId("");
    setSelectedItemId("");
    setRemarks("");
    setImg(null);
    onRefresh();
  };

  const handleCollect = async (id: string) => {
    await db.requests.updateStatus(id, RequestStatus.RECEIVED);
    onRefresh();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600">
            <Package size={24} />
          </div>
          <h2 className="font-bold text-slate-800 text-xl tracking-tight">
            Your Current Inventory
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {onHand.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 bg-slate-50 border border-dashed rounded-3xl">
              You currently have zero equipment. Submit a request to get stock.
            </div>
          ) : (
            onHand.map((i) => (
              <div
                key={i.id}
                className="p-8 bg-emerald-50/50 border border-emerald-100 rounded-[2rem] text-center shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-4xl font-black text-emerald-700 mb-1">
                  {i.quantity}
                </div>
                <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                  {i.name}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Collection */}
        <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden flex flex-col">
          <div className="px-8 py-6 border-b bg-indigo-50/20 flex items-center gap-3">
            <ArrowRightLeft size={20} className="text-indigo-600" />
            <h2 className="font-bold text-slate-800">Pending Collection</h2>
          </div>
          <div className="divide-y overflow-auto max-h-[400px] flex-1">
            {approved.length === 0 ? (
              <div className="p-20 text-center text-slate-400 text-sm italic">
                Nothing awaiting pickup.
              </div>
            ) : (
              approved.map((r: any) => (
                <div
                  key={r.id}
                  className="p-8 flex justify-between items-center hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex gap-1.5 flex-wrap mb-2">
                      {r.items.map((i: any, idx: number) => (
                        <span
                          key={idx}
                          className="text-[10px] font-black px-3 py-1 bg-white border rounded shadow-sm text-slate-600"
                        >
                          {i.quantity}x {i.type}
                        </span>
                      ))}
                    </div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                      Ready Since {new Date(r.approvedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCollect(r.id)}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95"
                  >
                    Collect Equipment
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Deployment Entry Form */}
        <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b bg-amber-50/20 flex items-center gap-3">
            <Store size={20} className="text-amber-600" />
            <h2 className="font-bold text-slate-800">Deployment Entry</h2>
          </div>
          <div className="p-10 space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">
                Customer / Shop Name
              </label>
              <SearchableSelect
                options={shopOptions}
                value={selectedShopId}
                onChange={setSelectedShopId}
                placeholder="Search for a shop..."
                emptyMessage="No shops found."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">
                Equipment Used
              </label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <SearchableSelect
                    options={spareOptions}
                    value={selectedItemId}
                    onChange={setSelectedItemId}
                    placeholder="Select Spare..."
                    emptyMessage="None on hand."
                  />
                </div>
                <button
                  disabled={isCompressing}
                  onClick={() => fileInput.current?.click()}
                  className={`px-5 py-4 rounded-2xl border-2 border-dashed flex items-center gap-2 font-black text-xs transition-all ${img ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "border-slate-300 text-slate-400 hover:border-indigo-500 hover:text-indigo-600"}`}
                >
                  {img ? <CheckCircle size={20} /> : <Camera size={20} />}
                  {isCompressing ? "Compressing..." : (img ? "Attached" : "Proof")}
                </button>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  ref={fileInput}
                  onChange={handleCapture}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">
                Remarks / Notes
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional notes about this deployment..."
                className="w-full p-5 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-600 min-h-[100px] resize-none font-medium text-sm"
              />
            </div>

            <button
              disabled={!selectedShopId || !selectedItemId}
              onClick={handleLogUsage}
              className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black shadow-xl disabled:opacity-20 active:scale-95 transition-all text-lg"
            >
              Record Transaction
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
