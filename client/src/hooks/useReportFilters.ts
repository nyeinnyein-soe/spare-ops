import { useState, useMemo, useEffect } from "react";

export function useReportFilters<T>(
    data: T[],
    filterFn: (item: T, searchQuery: string, startDate: string, endDate: string) => boolean,
    initialSort: { key: string; direction: "asc" | "desc" | null } = { key: "date", direction: "desc" }
) {
    const [searchQuery, setSearchQuery] = useState("");
    const [sortConfig, setSortConfig] = useState(initialSort);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        return `${year}-${month}-01`;
    });

    const [endDate, setEndDate] = useState(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    });

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, startDate, endDate, sortConfig]);

    const handleResetDates = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");

        setStartDate(`${year}-${month}-01`);
        setEndDate(`${year}-${month}-${day}`);
    };

    const applyQuickFilter = (type: string) => {
        const now = new Date();
        const formatDate = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        };

        let start = new Date();
        let end = new Date();

        switch (type) {
            case "this-week":
                start.setDate(now.getDate() - now.getDay());
                break;
            case "last-week":
                start.setDate(now.getDate() - now.getDay() - 7);
                end.setDate(now.getDate() - now.getDay() - 1);
                break;
            case "this-month":
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case "last-month":
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case "this-year":
                start = new Date(now.getFullYear(), 0, 1);
                break;
            case "last-year":
                start = new Date(now.getFullYear() - 1, 0, 1);
                end = new Date(now.getFullYear() - 1, 11, 31);
                break;
            default:
                return;
        }

        setStartDate(formatDate(start));
        setEndDate(formatDate(end));
    };

    const filteredData = useMemo(() => {
        return data.filter((item) => filterFn(item, searchQuery, startDate, endDate));
    }, [data, filterFn, searchQuery, startDate, endDate]);

    const handleSort = (key: string) => {
        let direction: "asc" | "desc" | null = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        } else if (sortConfig.key === key && sortConfig.direction === "desc") {
            direction = null;
        }
        setSortConfig({ key, direction });
    };

    return {
        searchQuery,
        setSearchQuery,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        sortConfig,
        setSortConfig,
        currentPage,
        setCurrentPage,
        itemsPerPage,
        handleResetDates,
        applyQuickFilter,
        filteredData,
        handleSort,
    };
}

export const filterByDateRange = (timestamp: number, startDate: string, endDate: string) => {
    const date = new Date(timestamp);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    return (!start || date >= start) && (!end || date <= end);
};
