import { useState, useMemo } from "react";
import { Image as ImageIcon, Calendar, RotateCcw } from "lucide-react";
import { useData } from "../contexts/DataContext";
import { useAuth } from "../contexts/AuthContext";
import StatusBadge from "../components/StatusBadge";
import ImageViewer from "../components/ImageViewer";
import DateRangePicker from "../components/DateRangePicker";

export default function History() {
  const { requests, usages } = useData();
  const { currentUser } = useAuth();

  const [tab, setTab] = useState<"r" | "u">("r");
  const [viewImage, setViewImage] = useState<string | null>(null);

  // --- DATE FILTER STATE (Default: Current Month) ---
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    // Manually construct YYYY-MM-01 to ensure local timezone accuracy
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  });

  const [endDate, setEndDate] = useState(() => {
    // Current date in YYYY-MM-DD
    return new Date().toISOString().split('T')[0];
  });

  // --- FILTER LOGIC ---
  const filterByDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    // Normalize times to ensure inclusive filtering
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    return (!start || date >= start) && (!end || date <= end);
  };

  const filteredRequests = useMemo(() => {
    const roleFiltered = currentUser?.role === "sales"
      ? requests.filter(r => r.requesterId === currentUser.id)
      : requests;

    return roleFiltered.filter(r => filterByDate(r.createdAt));
  }, [requests, currentUser, startDate, endDate]);

  const filteredUsages = useMemo(() => {
    const roleFiltered = currentUser?.role === "sales"
      ? usages.filter(u => u.salespersonId === currentUser.id)
      : usages;

    return roleFiltered.filter(u => filterByDate(u.usedAt));
  }, [usages, currentUser, startDate, endDate]);

  // Reset to Current Month
  const handleResetDates = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');

    setStartDate(`${year}-${month}-01`); // 1st of this month
    setEndDate(d.toISOString().split('T')[0]); // Today
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="w-8 h-1 bg-indigo-600 rounded-full" />
        <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
          Activity Log
        </h1>
      </div>

      <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden">
        {viewImage && <ImageViewer src={viewImage} onClose={() => setViewImage(null)} />}

        {/* TABS */}
        <div className="flex border-b bg-slate-50/50">
          <button onClick={() => setTab("r")} className={`flex-1 py-6 text-[10px] font-black uppercase tracking-widest transition-all ${tab === "r" ? "text-indigo-600 border-b-2 border-indigo-600 bg-white" : "text-slate-400 hover:bg-white/50"}`}>Requisitions</button>
          <button onClick={() => setTab("u")} className={`flex-1 py-6 text-[10px] font-black uppercase tracking-widest transition-all ${tab === "u" ? "text-indigo-600 border-b-2 border-indigo-600 bg-white" : "text-slate-400 hover:bg-white/50"}`}>Shop Deployments</button>
        </div>

        {/* DATE FILTER TOOLBAR */}
        <div className="px-6 py-4 border-b border-slate-100 bg-white flex justify-end">
          <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 shadow-sm overflow-hidden pr-2">

            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
            />

            <div className="w-px h-5 bg-slate-200 mx-1"></div>

            <button
              onClick={handleResetDates}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
              title="Reset to current month"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {/* LIST CONTENT */}
        <div className="p-10 space-y-5">
          {tab === "r" ? (
            filteredRequests.length === 0 ? (
              <div className="p-20 text-center text-slate-300 italic">No records found in this period.</div>
            ) : (
              filteredRequests.map((r) => (
                <div key={r.id} className="p-6 bg-white border border-slate-100 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-6 shadow-sm group hover:shadow-md transition-shadow">
                  <div>
                    <div className="font-bold text-base text-slate-800 mb-1">{r.requesterName}</div>
                    <div className="text-[10px] text-slate-400 font-black mb-3 uppercase tracking-widest">{new Date(r.createdAt).toLocaleString()}</div>
                    <div className="flex gap-2 flex-wrap">
                      {r.items
                        .filter(i => i.quantity > 0)
                        .map((i, idx) => (
                          <span key={idx} className="text-[10px] font-black px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-600">
                            {i.quantity}x {i.type}
                          </span>
                        ))
                      }
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))
            )
          ) : (
            filteredUsages.length === 0 ? (
              <div className="p-20 text-center text-slate-300 italic">No deployments found in this period.</div>
            ) : (
              filteredUsages.map((u) => (
                <div key={u.id} className="p-6 bg-white border border-slate-100 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-6 shadow-sm group hover:shadow-md transition-shadow">
                  <div className="flex gap-5 items-center">
                    <div className="h-16 w-16 rounded-2xl overflow-hidden border border-slate-100 cursor-pointer shadow-inner hover:scale-105 transition-transform flex items-center justify-center bg-slate-50" onClick={() => u.voucherImage && setViewImage(u.voucherImage)}>
                      {u.voucherImage ? <img src={u.voucherImage} className="w-full h-full object-cover" /> : <ImageIcon size={24} className="text-slate-300" />}
                    </div>
                    <div>
                      <div className="font-bold text-base text-slate-800 mb-0.5">{u.shopName}</div>
                      <div className="text-[10px] text-slate-400 font-black mb-1.5 uppercase tracking-widest">{new Date(u.usedAt).toLocaleString()}</div>
                      <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded inline-block">{u.partType}</div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <div className="text-[9px] text-slate-400 font-black uppercase mb-1.5 tracking-tighter">Processed By</div>
                    <div className="text-xs font-bold text-slate-700 bg-slate-50 border px-4 py-1.5 rounded-full">{u.salespersonName}</div>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}