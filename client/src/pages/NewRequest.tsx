import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { db } from "../services/dbService";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { SPARE_PARTS, PartType } from "../types";

export default function NewRequest() {
  const { currentUser } = useAuth();
  const { refreshData } = useData();
  const navigate = useNavigate();

  const [qtys, setQtys] = useState<{ [key in PartType]: number }>({
    "Remax Charger": 0,
    "Charging Cable": 0,
    "Micro Cable": 0,
    Battery: 0,
  });
  const has = Object.values(qtys).some((q) => q > 0);

  const handleSubmit = async () => {
    if (!currentUser) return;
    await db.requests.insert(
      currentUser.id,
      Object.entries(qtys).map(([type, quantity]) => ({
        type: type as PartType,
        quantity,
      })).filter(i => i.quantity > 0),
    );
    await refreshData();
    navigate("/");
  };

  return (
    <div className="bg-white rounded-[3rem] border shadow-2xl p-12 max-w-2xl mx-auto mt-10 animate-in zoom-in-95 duration-300">
      <div className="h-20 w-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-indigo-600 mx-auto mb-8">
        <ClipboardList size={40} />
      </div>
      <h2 className="text-4xl font-black mb-2 text-center text-slate-900">
        Requisition
      </h2>
      <p className="text-center text-slate-400 text-sm font-medium mb-10">
        Select equipment quantities.
      </p>

      <div className="space-y-4 mb-10">
        {SPARE_PARTS.map((p) => (
          <div
            key={p}
            className="flex items-center justify-between p-6 bg-slate-50/50 rounded-3xl border border-slate-100 group hover:bg-white hover:border-indigo-100 hover:shadow-md transition-all"
          >
            <div>
              <div className="font-bold text-slate-800 text-lg leading-tight">
                {p}
              </div>
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">
                Inventory Supply
              </div>
            </div>
            <div className="flex items-center gap-6">
              <button
                onClick={() =>
                  setQtys({ ...qtys, [p]: Math.max(0, qtys[p] - 1) })
                }
                className="h-12 w-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center font-black shadow-sm text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all"
              >
                -
              </button>
              <span className="w-6 text-center font-black text-2xl text-slate-900">
                {qtys[p]}
              </span>
              <button
                onClick={() => setQtys({ ...qtys, [p]: qtys[p] + 1 })}
                className="h-12 w-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center font-black shadow-sm text-indigo-600 hover:border-indigo-100 transition-all"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <button
          onClick={handleSubmit}
          disabled={!has}
          className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-indigo-100 disabled:opacity-20 transition-all active:scale-95 text-xl"
        >
          Confirm Requisition
        </button>
        <button
          onClick={() => navigate("/")}
          className="w-full py-4 text-slate-400 font-bold hover:bg-slate-50 rounded-[1.5rem] transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
