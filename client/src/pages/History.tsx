import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { useData } from "../contexts/DataContext";
import { useAuth } from "../contexts/AuthContext";
import StatusBadge from "../components/StatusBadge";
import ImageViewer from "../components/ImageViewer";

export default function History() {
  const { requests, usages } = useData();
  const { currentUser } = useAuth();
  const [tab, setTab] = useState<"r" | "u">("r");
  const [viewImage, setViewImage] = useState<string | null>(null);

  // Filter: Sales only sees their own history
  const myRequests =
    currentUser?.role === "sales"
      ? requests.filter((r) => r.requesterId === currentUser.id)
      : requests;
  const myUsages =
    currentUser?.role === "sales"
      ? usages.filter((u) => u.salespersonId === currentUser.id)
      : usages;

  return (
    <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
      {viewImage && (
        <ImageViewer src={viewImage} onClose={() => setViewImage(null)} />
      )}

      <div className="flex border-b bg-slate-50/50">
        <button
          onClick={() => setTab("r")}
          className={`flex-1 py-6 text-[10px] font-black uppercase tracking-widest transition-all ${tab === "r" ? "text-indigo-600 border-b-2 border-indigo-600 bg-white" : "text-slate-400 hover:bg-white/50"}`}
        >
          Requisitions
        </button>
        <button
          onClick={() => setTab("u")}
          className={`flex-1 py-6 text-[10px] font-black uppercase tracking-widest transition-all ${tab === "u" ? "text-indigo-600 border-b-2 border-indigo-600 bg-white" : "text-slate-400 hover:bg-white/50"}`}
        >
          Shop Deployments
        </button>
      </div>

      <div className="p-10 space-y-5">
        {tab === "r" ? (
          myRequests.length === 0 ? (
            <div className="p-20 text-center text-slate-300 italic">
              No records.
            </div>
          ) : (
            myRequests.map((r) => (
              <div
                key={r.id}
                className="p-6 bg-white border border-slate-100 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-6 shadow-sm group hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="font-bold text-base text-slate-800 mb-1">
                    {r.requesterName}
                  </div>
                  <div className="text-[10px] text-slate-400 font-black mb-3 uppercase tracking-widest">
                    {new Date(r.createdAt).toLocaleString()}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {r.items.map(
                      (i, idx) =>
                        i.quantity > 0 && (
                          <span
                            key={idx}
                            className="text-[10px] font-black px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-600"
                          >
                            {i.quantity}x {i.type}
                          </span>
                        ),
                    )}
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))
          )
        ) : myUsages.length === 0 ? (
          <div className="p-20 text-center text-slate-300 italic">
            No deployments.
          </div>
        ) : (
          myUsages.map((u) => (
            <div
              key={u.id}
              className="p-6 bg-white border border-slate-100 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-6 shadow-sm group hover:shadow-md transition-shadow"
            >
              <div className="flex gap-5 items-center">
                <div
                  className="h-16 w-16 rounded-2xl overflow-hidden border border-slate-100 cursor-pointer shadow-inner hover:scale-105 transition-transform flex items-center justify-center bg-slate-50"
                  onClick={() => u.voucherImage && setViewImage(u.voucherImage)}
                >
                  {u.voucherImage ? (
                    <img
                      src={u.voucherImage}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon size={24} className="text-slate-300" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-base text-slate-800 mb-0.5">
                    {u.shopName}
                  </div>
                  <div className="text-[10px] text-slate-400 font-black mb-1.5 uppercase tracking-widest">
                    {new Date(u.usedAt).toLocaleString()}
                  </div>
                  <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded inline-block">
                    {u.partType}
                  </div>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <div className="text-[9px] text-slate-400 font-black uppercase mb-1.5 tracking-tighter">
                  Processed By
                </div>
                <div className="text-xs font-bold text-slate-700 bg-slate-50 border px-4 py-1.5 rounded-full">
                  {u.salespersonName}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
