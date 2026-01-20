import React from "react";
import ReactDatePicker from "react-datepicker";
import { createPortal } from "react-dom"; // <--- Import for Portal
import { Calendar as CalendarIcon } from "lucide-react";

interface DateRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  onChange: (start: string, end: string) => void;
}

export default function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  // Parse YYYY-MM-DD strings to Local Date objects safely
  const parseDate = (dateStr: string) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d); // Month is 0-indexed
  };

  const start = parseDate(startDate);
  const end = parseDate(endDate);

  // Convert Date object back to YYYY-MM-DD (Local Time)
  const formatDate = (date: Date | null) => {
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleChange = (dates: [Date | null, Date | null]) => {
    const [newStart, newEnd] = dates;
    onChange(formatDate(newStart), formatDate(newEnd));
  };

  return (
    <div className="relative group flex items-center">
      <CalendarIcon 
        size={16} 
        className="absolute left-3.5 text-slate-400 group-hover:text-blue-600 transition-colors pointer-events-none z-10" 
      />
      <ReactDatePicker
        selectsRange={true}
        startDate={start}
        endDate={end}
        onChange={handleChange}
        monthsShown={2}
        dateFormat="MMM d, yyyy"
        placeholderText="Select date range"
        className="w-64 pl-10 pr-4 py-2.5 text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer tracking-wide"
        
        // --- THE FIXES ---
        // 1. Render in Body to avoid 'overflow-hidden' clipping
        popperContainer={({ children }) => createPortal(children, document.body)}
        // 2. Adjust z-index to sit above everything
        popperClassName="z-[9999]" 
        // 3. Prevent keyboard typing
        onKeyDown={(e) => e.preventDefault()} 
      />
    </div>
  );
}