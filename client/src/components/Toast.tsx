import { Info, CheckCircle, AlertCircle, X } from "lucide-react";
import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  show: boolean;
  type?: ToastType;
}

export default function Toast({
  message,
  show,
  type = "info",
}: ToastProps) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    setVisible(show);
  }, [show]);

  if (!visible) return null;

  const config = {
    success: {
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      accent: "bg-emerald-500",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      icon: <CheckCircle size={18} />,
      title: "Success",
    },
    error: {
      bg: "bg-rose-50",
      border: "border-rose-100",
      accent: "bg-rose-500",
      iconBg: "bg-rose-100",
      iconColor: "text-rose-600",
      icon: <AlertCircle size={18} />,
      title: "Error",
    },
    info: {
      bg: "bg-white/80",
      border: "border-white/40",
      accent: "bg-indigo-500",
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-600",
      icon: <Info size={18} />,
      title: "Notification",
    },
  }[type];

  return (
    <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-right-4 duration-500 fade-in">
      <div className={`relative overflow-hidden backdrop-blur-xl border ${config.bg} ${config.border} text-slate-800 pl-4 pr-12 py-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] min-w-[320px] group`}>

        {/* Left Accent Line */}
        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${config.accent}`}></div>

        <div className="flex items-start gap-4">
          <div className={`mt-0.5 p-2 ${config.iconBg} ${config.iconColor} rounded-full shrink-0`}>
            {config.icon}
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-sm text-slate-900 mb-0.5">{config.title}</h4>
            <p className="text-xs font-medium text-slate-500 leading-relaxed">{message}</p>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={() => setVisible(false)}
          className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X size={14} />
        </button>

        {/* Progress Bar Animation */}
        <div className={`absolute bottom-0 left-0 h-0.5 ${config.accent}/20 w-full`}>
          <div className={`h-full ${config.accent} animate-[width_3s_linear_forwards] w-full origin-left`}></div>
        </div>
      </div>
    </div>
  );
}
