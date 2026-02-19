import { Sparkles, Loader2, ChevronRight } from "lucide-react";

export default function Insights() {
  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="w-8 h-1 bg-indigo-600 rounded-full" />
        <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
          AI Insights
        </h1>
      </div>

      <div className="bg-white rounded-[3rem] border p-12 shadow-sm space-y-8">
        <div className="flex items-center gap-5 mb-4">
          <div className="p-4 bg-indigo-600 rounded-[1.5rem] text-white shadow-2xl shadow-indigo-200">
            <Sparkles size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">
            AI Inventory Audit
          </h2>
        </div>
        <p className="text-slate-500 text-lg leading-relaxed font-medium">
          Gemini AI parses your shop history and requisition logs to optimize
          stock distribution.
        </p>
        <button className="bg-indigo-600 text-white px-12 py-6 rounded-[1.5rem] font-black shadow-2xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-1 transition-all flex items-center gap-3 active:scale-95 group text-lg">
          Generate Full Database Audit
          <ChevronRight
            className="group-hover:translate-x-1 transition-transform"
            size={24}
          />
        </button>
      </div>
    </div>
  );
}
