import React from "react";

export default function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: any;
}) {
  return (
    <div className="bg-white p-8 rounded-3xl border shadow-sm flex items-center gap-6 hover:-translate-y-1 transition-all group">
      <div className="p-5 bg-slate-50 rounded-2xl border group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
          {label}
        </div>
        <div className="text-3xl font-black text-slate-900 leading-none">
          {value}
        </div>
      </div>
    </div>
  );
}
