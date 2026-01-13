import { Info } from "lucide-react";

export default function Toast({
  message,
  show,
}: {
  message: string;
  show: boolean;
}) {
  if (!show) return null;
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 duration-300">
      <div className="p-2 bg-white/10 rounded-full">
        <Info size={20} className="text-sky-400" />
      </div>
      <div>
        <div className="font-bold text-sm">Notification</div>
        <div className="text-xs text-slate-300">{message}</div>
      </div>
    </div>
  );
}
