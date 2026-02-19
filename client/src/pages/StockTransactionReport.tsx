import { useState, useMemo, useCallback } from "react";
import {
    RotateCcw,
    Search,
    Download,
    ChevronUp,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight,
} from "lucide-react";
import { useData } from "../contexts/DataContext";
import { exportToExcel } from "../utils/excelHelper";
import DateRangePicker from "../components/DateRangePicker";
import { useReportFilters, filterByDateRange } from "../hooks/useReportFilters";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

export default function StockTransactionReport() {
    const { stockLogs, inventoryItems = [], suppliers = [], requests = [] } = useData();

    const requestMap = useMemo(() => {
        const map: Record<string, string> = {};
        requests.forEach((r: any) => {
            map[r.id] = r.requesterName || "Unknown Staff";
        });
        return map;
    }, [requests]);

    const [selectedSupplierId, setSelectedSupplierId] = useState<string>("all");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
    const [selectedType, setSelectedType] = useState<string>("all"); // all, in, out, adjustment
    const [activeView, setActiveView] = useState<"report" | "insights">("report");

    const filterFn = useCallback(
        (log: any, searchQuery: string, startDate: string, endDate: string) => {
            // Date Filter
            const inDateRange = filterByDateRange(log.createdAt, startDate, endDate);
            if (!inDateRange) return false;

            // Supplier Filter
            if (selectedSupplierId !== "all" && log.supplierId !== selectedSupplierId) return false;

            // Item Filter
            if (selectedCategoryId !== "all" && log.inventoryItemId !== selectedCategoryId) return false;

            // Type Filter
            if (selectedType !== "all") {
                if (selectedType === "in") return log.reason === "STOCK_IN";
                if (selectedType === "out") return log.change < 0 && log.reason !== "ADJUSTMENT";
                if (selectedType === "adjustment") return log.reason === "ADJUSTMENT";
            }

            // Search Filter
            const term = searchQuery.toLowerCase();
            const matchesSearch =
                log.inventoryItem?.name?.toLowerCase().includes(term) ||
                log.reason?.toLowerCase().includes(term) ||
                (log.remarks && log.remarks.toLowerCase().includes(term)) ||
                (log.performer?.name && log.performer.name.toLowerCase().includes(term)) ||
                (log.supplier?.name && log.supplier.name.toLowerCase().includes(term));

            return matchesSearch;
        },
        [selectedSupplierId, selectedCategoryId, selectedType]
    );

    const {
        searchQuery,
        setSearchQuery,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        sortConfig,
        currentPage,
        setCurrentPage,
        itemsPerPage,
        handleResetDates,
        applyQuickFilter,
        filteredData: filteredLogs,
        handleSort,
    } = useReportFilters(stockLogs || [], filterFn);

    const chartData = useMemo(() => {
        const dailyGroups: Record<string, { date: string, in: number, out: number, timestamp: number }> = {};
        const itemGroups: Record<string, number> = {};
        let inCount = 0, outCount = 0, adjCount = 0;

        filteredLogs.forEach(log => {
            const d = new Date(log.createdAt);
            const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const timestamp = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

            if (!dailyGroups[dateStr]) dailyGroups[dateStr] = { date: dateStr, in: 0, out: 0, timestamp };
            if (log.change > 0) dailyGroups[dateStr].in += log.change;
            else dailyGroups[dateStr].out += Math.abs(log.change);

            const itemName = log.inventoryItem?.name || "Unknown";
            itemGroups[itemName] = (itemGroups[itemName] || 0) + Math.abs(log.change);

            if (log.reason === "STOCK_IN") inCount++;
            else if (log.reason === "ADJUSTMENT") adjCount++;
            else outCount++;
        });

        const trend = Object.values(dailyGroups).sort((a, b) => a.timestamp - b.timestamp);
        const items = Object.entries(itemGroups)
            .map(([name, volume]) => ({ name, volume }))
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 8);
        const distribution = [
            { name: 'Stock In', value: inCount, color: '#10b981' },
            { name: 'Stock Out', value: outCount, color: '#f59e0b' },
            { name: 'Adjustment', value: adjCount, color: '#6366f1' }
        ].filter(d => d.value > 0);

        return { trend, items, distribution };
    }, [filteredLogs]);

    const stats = useMemo(() => {
        const totalIn = filteredLogs.filter(l => l.change > 0).reduce((sum, l) => sum + l.change, 0);
        const totalOut = Math.abs(filteredLogs.filter(l => l.change < 0).reduce((sum, l) => sum + l.change, 0));
        return {
            totalIn,
            totalOut,
            netMovement: totalIn - totalOut,
        };
    }, [filteredLogs]);

    const sortedData = useMemo(() => {
        const data = [...filteredLogs];
        if (!sortConfig.key || !sortConfig.direction) return data;

        return data.sort((a, b) => {
            let aVal: any = "";
            let bVal: any = "";

            if (sortConfig.key === "date") { aVal = new Date(a.createdAt).getTime(); bVal = new Date(b.createdAt).getTime(); }
            else if (sortConfig.key === "name") { aVal = (a.inventoryItem?.name || "").toLowerCase(); bVal = (b.inventoryItem?.name || "").toLowerCase(); }
            else if (sortConfig.key === "qty") { aVal = a.change; bVal = b.change; }

            if (sortConfig.direction === "asc") return aVal > bVal ? 1 : -1;
            return aVal < bVal ? 1 : -1;
        });
    }, [filteredLogs, sortConfig]);

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedData.slice(start, start + itemsPerPage);
    }, [sortedData, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedData.length / itemsPerPage);

    const handleExport = async () => {
        const dataToExport = sortedData.map(log => {
            const isRequest = log.reason === "REQUEST_APPROVED";
            const isStockIn = log.reason === "STOCK_IN";
            const isAdjustment = log.reason === "ADJUSTMENT";

            let type = "Other";
            if (isStockIn) type = "Stock In";
            else if (isAdjustment) type = "Adjustment";
            else if (log.change < 0) type = "Stock Out";
            else if (log.change > 0) type = "Stock In"; // Fallback for positive changes that aren't STOCK_IN

            let sourceDest = log.performer?.name || "System";
            if (isStockIn) sourceDest = log.supplier?.name || "Direct Stock In";
            else if (isRequest) sourceDest = requestMap[log.referenceId] || "Staff";

            return {
                Date: new Date(log.createdAt).toLocaleDateString(),
                Time: new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                Type: type,
                "Supplier / Staff": sourceDest,
                "Product Name": log.inventoryItem?.name || "Unknown Item",
                "Transaction Qty": log.change > 0 ? `+${log.change}` : log.change,
                "New Balance": log.newStock,
                "Logged By": log.performer?.name || "System"
            };
        });
        await exportToExcel(dataToExport, `Stock_Transactions_${new Date().toISOString().split('T')[0]}`);
    };

    const SortIndicator = ({ column }: { column: string }) => {
        if (sortConfig.key !== column) return null;
        return sortConfig.direction === "asc" ? <ChevronUp size={14} className="ml-1" /> : sortConfig.direction === "desc" ? <ChevronDown size={14} className="ml-1" /> : null;
    };

    return (
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-8 space-y-8 animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-1 bg-indigo-600 rounded-full" />
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">
                        Stock Transaction Report
                    </h1>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                        <button
                            onClick={() => setActiveView("report")}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'report' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                        >
                            Report
                        </button>
                        <button
                            onClick={() => setActiveView("insights")}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'insights' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                        >
                            Insights
                        </button>
                    </div>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95 group"
                    >
                        <Download size={18} className="group-hover:scale-110 transition-transform" /> Export Excel
                    </button>
                </div>
            </div>

            {/* Filters Section */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Filter Transactions</h3>
                    <button
                        onClick={() => {
                            handleResetDates();
                            setSearchQuery("");
                            setSelectedSupplierId("all");
                            setSelectedCategoryId("all");
                            setSelectedType("all");
                        }}
                        className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                    >
                        Clear All
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                            <DateRangePicker
                                startDate={startDate}
                                endDate={endDate}
                                onChange={(start, end) => {
                                    setStartDate(start);
                                    setEndDate(end);
                                }}
                                className="min-w-[280px]"
                            />
                            <div className="w-px h-6 bg-slate-200 mx-1"></div>
                            <div className="relative">
                                <select
                                    onChange={(e) => applyQuickFilter(e.target.value)}
                                    className="bg-transparent border-transparent text-slate-600 text-[10px] font-black uppercase pl-3 pr-8 py-2.5 rounded-xl outline-none hover:bg-slate-100 focus:bg-white transition-all cursor-pointer appearance-none min-w-[120px]"
                                    defaultValue=""
                                >
                                    <option value="" disabled>Range</option>
                                    <option value="this-week">This Week</option>
                                    <option value="last-week">Last Week</option>
                                    <option value="this-month">This Month</option>
                                    <option value="last-month">Last Month</option>
                                    <option value="this-year">This Year</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <ChevronDown size={14} />
                                </div>
                            </div>
                            <button
                                onClick={handleResetDates}
                                className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl transition-all"
                                title="Reset to current month"
                            >
                                <RotateCcw size={16} />
                            </button>
                        </div>

                        <div className="flex-1 min-w-[300px] relative group">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search products, suppliers, remarks..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Supplier</label>
                            <div className="relative">
                                <select
                                    value={selectedSupplierId}
                                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer shadow-sm"
                                >
                                    <option value="all">All Suppliers</option>
                                    {suppliers?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <ChevronDown size={16} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Products</label>
                            <div className="relative">
                                <select
                                    value={selectedCategoryId}
                                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer shadow-sm"
                                >
                                    <option value="all">All Products</option>
                                    {inventoryItems?.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <ChevronDown size={16} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Transaction Type</label>
                            <div className="relative">
                                <select
                                    value={selectedType}
                                    onChange={(e) => setSelectedType(e.target.value)}
                                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer shadow-sm"
                                >
                                    <option value="all">All Types</option>
                                    <option value="in">Stock In (Additions)</option>
                                    <option value="out">Stock Out (Removals)</option>
                                    <option value="adjustment">Adjustments</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <ChevronDown size={16} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {activeView === 'insights' && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-40">
                            <div className="flex justify-between items-start">
                                <p className="text-slate-400 font-bold text-sm tracking-tight">Total Stock In</p>
                                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                                    <ArrowDownRight size={18} />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-baseline gap-2">
                                    <h2 className="text-3xl font-black text-slate-800 tracking-tighter">{stats.totalIn.toLocaleString()}</h2>
                                </div>
                                <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1">Units added this period</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-40">
                            <div className="flex justify-between items-start">
                                <p className="text-slate-400 font-bold text-sm tracking-tight">Total Stock Out</p>
                                <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center">
                                    <ArrowUpRight size={18} />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-baseline gap-2">
                                    <h2 className="text-3xl font-black text-slate-800 tracking-tighter">{stats.totalOut.toLocaleString()}</h2>
                                </div>
                                <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1">Units removed this period</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-40">
                            <div className="flex justify-between items-start">
                                <p className="text-slate-400 font-bold text-sm tracking-tight">Net Movement</p>
                                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center">
                                    <RotateCcw size={18} />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-baseline gap-2">
                                    <h2 className="text-3xl font-black text-slate-800 tracking-tighter">
                                        {stats.netMovement > 0 ? "+" : ""}{stats.netMovement.toLocaleString()}
                                    </h2>
                                </div>
                                <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1">Balance change this period</p>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Trend Area Chart */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Movement Trend</h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData.trend}>
                                        <defs>
                                            <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                                            itemStyle={{ fontWeight: '900' }}
                                        />
                                        <Area type="monotone" dataKey="in" stroke="#10b981" fillOpacity={1} fill="url(#colorIn)" strokeWidth={3} name="Stock In" />
                                        <Area type="monotone" dataKey="out" stroke="#f59e0b" fillOpacity={1} fill="url(#colorOut)" strokeWidth={3} name="Stock Out" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Items Bar Chart */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Volume by Product</h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData.items} layout="vertical" margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }}
                                            width={100}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#f8fafc' }}
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                                        />
                                        <Bar dataKey="volume" fill="#6366f1" radius={[0, 8, 8, 0]} barSize={20} name="Total Volume" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Distribution Pie Chart */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 lg:col-span-2">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">Transaction Distribution</h3>
                            <div className="h-[250px] w-full flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartData.distribution}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {chartData.distribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                                        />
                                        <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">{value}</span>} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {activeView === 'report' && (
                <>
                    {/* Transaction Table */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px] animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th
                                            className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors"
                                            onClick={() => handleSort("date")}
                                        >
                                            <div className="flex items-center">DATE <SortIndicator column="date" /></div>
                                        </th>
                                        <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">TYPE</th>
                                        <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">SUPPLIER / STAFF</th>
                                        <th
                                            className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors"
                                            onClick={() => handleSort("name")}
                                        >
                                            <div className="flex items-center">PRODUCT NAME <SortIndicator column="name" /></div>
                                        </th>
                                        <th
                                            className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors"
                                            onClick={() => handleSort("qty")}
                                        >
                                            <div className="flex items-center justify-end">TRANSACTION QTY <SortIndicator column="qty" /></div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {paginatedData.map((log) => (
                                        <tr key={log.id} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-6 whitespace-nowrap">
                                                <span className="text-slate-500 font-bold text-sm">
                                                    {new Date(log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${log.reason === "STOCK_IN" ? "bg-emerald-50 text-emerald-600" :
                                                    log.reason === "ADJUSTMENT" ? "bg-indigo-50 text-indigo-600" :
                                                        "bg-amber-50 text-amber-600"
                                                    }`}>
                                                    {log.reason === "STOCK_IN" ? "Stock In" :
                                                        log.reason === "ADJUSTMENT" ? "Adjustment" :
                                                            "Stock Out"}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-slate-600 font-bold text-sm">
                                                    {log.reason === "STOCK_IN" ? (log.supplier?.name || "Direct Stock In") :
                                                        log.reason === "REQUEST_APPROVED" ? (requestMap[log.referenceId] || "Request Fulfillment") :
                                                            (log.performer?.name || log.reason.replace("_", " "))}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-slate-800 font-black text-sm">{log.inventoryItem?.name || "Unknown Product"}</span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <span className={`font-black text-sm ${log.change > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                                    {log.change > 0 ? `+${log.change}` : log.change}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {paginatedData.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-24 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4">
                                                        <Search size={32} />
                                                    </div>
                                                    <p className="text-slate-400 font-bold tracking-tight">No transactions found for the selected filters.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination */}
                    {
                        totalPages > 1 && (
                            <div className="flex items-center justify-between bg-white px-8 py-6 rounded-[2rem] border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom duration-500">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                                    Showing <span className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-800">{Math.min(currentPage * itemsPerPage, sortedData.length)}</span> of <span className="text-slate-800">{sortedData.length}</span> results
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-3 rounded-2xl border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <div className="flex items-center gap-1">
                                        {[...Array(totalPages)].map((_, i) => {
                                            const pageNum = i + 1;
                                            if (totalPages > 5 && pageNum !== 1 && pageNum !== totalPages && Math.abs(pageNum - currentPage) > 1) {
                                                if (pageNum === 2 || pageNum === totalPages - 1) return <span key={pageNum} className="px-1 text-slate-300 font-black">...</span>;
                                                return null;
                                            }
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={`min-w-[44px] h-11 rounded-2xl text-[10px] font-black transition-all ${currentPage === pageNum ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-slate-400 hover:bg-slate-50"}`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-3 rounded-2xl border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        )
                    }
                </>
            )
            }
        </div >
    );
}

