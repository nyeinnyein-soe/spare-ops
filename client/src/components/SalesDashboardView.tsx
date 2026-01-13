import { useState, useRef, useMemo } from "react";
import {
  Package,
  ArrowRightLeft,
  Store,
  Camera,
  CheckCircle,
} from "lucide-react";
import { db } from "../services/dbService";
import { PartType, RequestStatus } from "../types";
import { useAuth } from "../contexts/AuthContext";

export default function SalesDashboardView({
  requests,
  usages,
  onRefresh,
}: any) {
  const { currentUser } = useAuth();
  const approved = requests.filter(
    (r: any) => r.status === RequestStatus.APPROVED,
  );

  const [shop, setShop] = useState("");
  const [part, setPart] = useState<PartType | "">("");
  const [img, setImg] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Calculate OnHand
  const onHand = useMemo(() => {
    if (!currentUser) return [];
    const counts: any = {};
    requests
      .filter((r: any) => r.status === RequestStatus.RECEIVED)
      .forEach((r: any) =>
        r.items.forEach(
          (i: any) => (counts[i.type] = (counts[i.type] || 0) + i.quantity),
        ),
      );
    usages.forEach(
      (u: any) => (counts[u.partType] = (counts[u.partType] || 0) - 1),
    );
    return Object.entries(counts)
      .filter(([_, q]) => (q as number) > 0)
      .map(([t, q]) => ({ type: t as PartType, quantity: q as number }));
  }, [requests, usages, currentUser]);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImg(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleLogUsage = async () => {
    if (!part) return;
    await db.usages.insert({
      shopName: shop,
      partType: part as PartType,
      salespersonId: currentUser!.id,
      voucherImage: img || undefined,
    });
    setShop("");
    setPart("");
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
              Zero equipment.
            </div>
          ) : (
            onHand.map((i: any) => (
              <div
                key={i.type}
                className="p-8 bg-emerald-50/50 border border-emerald-100 rounded-[2rem] text-center shadow-sm"
              >
                <div className="text-4xl font-black text-emerald-700 mb-1">
                  {i.quantity}
                </div>
                <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                  {i.type}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Collections */}
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
                  <div>
                    <div className="flex gap-1.5 flex-wrap mb-2">
                      {r.items.map((i: any, idx: number) =>
                        i.quantity ? (
                          <span
                            key={idx}
                            className="text-[10px] font-black px-3 py-1 bg-white border rounded shadow-sm text-slate-600"
                          >
                            {i.quantity}x {i.type}
                          </span>
                        ) : (
                          ""
                        ),
                      )}
                    </div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                      Ready Since {new Date(r.approvedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCollect(r.id)}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black hover:bg-indigo-700 shadow-xl active:scale-95"
                  >
                    Collect
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Entry Form */}
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
              <input
                value={shop}
                onChange={(e) => setShop(e.target.value)}
                className="w-full p-4 border rounded-2xl outline-none focus:border-indigo-500 shadow-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">
                Equipment
              </label>
              <div className="flex gap-4">
                <select
                  value={part}
                  onChange={(e) => setPart(e.target.value as PartType)}
                  className="flex-1 p-4 border rounded-2xl outline-none shadow-sm"
                >
                  <option value="">Select...</option>
                  {onHand.map((i) => (
                    <option key={i.type} value={i.type}>
                      {i.type}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => fileInput.current?.click()}
                  className={`px-5 py-4 rounded-2xl border-2 border-dashed flex items-center gap-2 font-black text-xs ${img ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "border-slate-300 text-slate-400"}`}
                >
                  {img ? <CheckCircle size={20} /> : <Camera size={20} />}
                </button>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInput}
                  onChange={handleCapture}
                />
              </div>
            </div>
            <button
              disabled={!shop || !part}
              onClick={handleLogUsage}
              className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black shadow-xl disabled:opacity-20 active:scale-95"
            >
              Record Transaction
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
