import { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";

interface Option {
    value: string;
    label: string;
    sublabel?: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    emptyMessage?: string;
}

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "Select an option...",
    emptyMessage = "No options found.",
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = useMemo(
        () => options.find((opt) => opt.value === value),
        [options, value]
    );

    const filteredOptions = useMemo(() => {
        if (!searchQuery.trim()) return options;
        const query = searchQuery.toLowerCase();
        return options.filter(
            (opt) =>
                opt.label.toLowerCase().includes(query) ||
                (opt.sublabel && opt.sublabel.toLowerCase().includes(query))
        );
    }, [options, searchQuery]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
        setSearchQuery("");
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full p-4 bg-white border rounded-2xl flex items-center justify-between cursor-pointer transition-all shadow-sm ${isOpen ? "border-indigo-500 ring-4 ring-indigo-500/10" : "border-slate-200"
                    }`}
            >
                <div className="flex-1 truncate">
                    {selectedOption ? (
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-sm">{selectedOption.label}</span>
                            {selectedOption.sublabel && (
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mt-1">
                                    {selectedOption.sublabel}
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-slate-400 text-sm font-medium">{placeholder}</span>
                    )}
                </div>
                <div className="flex items-center gap-2 text-slate-400 pl-2">
                    {value && (
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange("");
                            }}
                            className="p-1 hover:bg-slate-100 rounded-full hover:text-rose-500 transition-colors"
                        >
                            <X size={14} />
                        </div>
                    )}
                    <ChevronDown size={18} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                </div>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-[2rem] shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b bg-slate-50/50 flex items-center gap-3 group focus-within:bg-white transition-colors">
                        <Search size={18} className="text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Start typing to search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-transparent border-none outline-none text-sm font-medium placeholder:text-slate-400"
                        />
                    </div>

                    <div className="max-h-60 overflow-y-auto p-2">
                        {filteredOptions.length === 0 ? (
                            <div className="py-8 text-center text-slate-400 text-sm italic">
                                {emptyMessage}
                            </div>
                        ) : (
                            filteredOptions.map((opt) => {
                                const isSelected = opt.value === value;
                                return (
                                    <div
                                        key={opt.value}
                                        onClick={() => handleSelect(opt.value)}
                                        className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all ${isSelected ? "bg-indigo-50" : "hover:bg-slate-50"
                                            }`}
                                    >
                                        <div className="flex flex-col flex-1 overflow-hidden">
                                            <span className={`text-sm font-bold truncate ${isSelected ? "text-indigo-600" : "text-slate-700"}`}>
                                                {opt.label}
                                            </span>
                                            {opt.sublabel && (
                                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
                                                    {opt.sublabel}
                                                </span>
                                            )}
                                        </div>
                                        {isSelected && <Check size={16} className="text-indigo-600 shrink-0 ml-4" />}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
