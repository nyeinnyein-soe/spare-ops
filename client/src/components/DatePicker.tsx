import React from "react";
import ReactDatePicker from "react-datepicker";
import { Calendar as CalendarIcon } from "lucide-react";

interface DatePickerProps {
  selected: string | Date;
  onChange: (date: Date) => void;
  placeholder?: string;
}

export default function DatePicker({ selected, onChange, placeholder }: DatePickerProps) {
  // Convert string to Date object if necessary
  const dateValue = typeof selected === 'string' ? new Date(selected) : selected;

  return (
    <div className="relative group">
      <CalendarIcon 
        size={16} 
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-600 transition-colors pointer-events-none z-10" 
      />
      <ReactDatePicker
        selected={dateValue}
        onChange={(date) => date && onChange(date)}
        dateFormat="MMM d, yyyy"
        placeholderText={placeholder || "Select date"}
        className="w-full pl-10 pr-4 py-2 text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer w-32"
        popperClassName="z-50" // Ensure it sits on top of everything
        calendarClassName="font-sans"
        onKeyDown={(e) => e.preventDefault()} // Prevent typing, force selection
      />
    </div>
  );
}