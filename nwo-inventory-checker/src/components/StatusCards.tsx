"use client";

import type { StatusCounts } from "@/types/inventory";

interface StatusCardsProps {
  counts: StatusCounts;
  activeFilter: string | null;
  onFilterChange: (status: string | null) => void;
}

export const statusChips = [
  { label: "All", countKey: "total" as const, statusKey: null },
  { label: "Backordered", countKey: "backordered" as const, statusKey: "Backordered" },
  { label: "Not Received", countKey: "notReceived" as const, statusKey: "Not Received" },
  { label: "Ordered", countKey: "ordered" as const, statusKey: "Ordered" },
  { label: "Received", countKey: "received" as const, statusKey: "Received" },
  { label: "Returned", countKey: "returned" as const, statusKey: "Returned" },
  { label: "Sent Out", countKey: "sentOut" as const, statusKey: "Sent Out" },
  { label: "Paint/Stain", countKey: "sentToPaintStain" as const, statusKey: "Sent To Paint/Stain" },
  { label: "Stock", countKey: "stock" as const, statusKey: "Stock" },
];

export function StatusCards({ counts, activeFilter, onFilterChange }: StatusCardsProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 px-4 md:px-0 scrollbar-hide">
      {statusChips.map((chip) => {
        const isActive = activeFilter === chip.statusKey;
        const count = counts[chip.countKey];
        return (
          <button
            key={chip.label}
            onClick={() => onFilterChange(isActive ? null : chip.statusKey)}
            className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all
              ${isActive
                ? "bg-[#6CC14C] text-white shadow-sm"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
          >
            <span className="font-bold tabular-nums">{count}</span>
            <span>{chip.label}</span>
          </button>
        );
      })}
    </div>
  );
}
