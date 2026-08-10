"use client";

import type { StatusCounts } from "@/types/inventory";
import { getStatusConfig } from "./StatusBadge";

interface StatusCardsProps {
  counts: StatusCounts;
  activeFilter: string | null;
  onFilterChange: (status: string | null) => void;
}

const cards = [
  { label: "All", countKey: "total" as const, icon: "📦", statusKey: null },
  { label: "Backordered", countKey: "backordered" as const, icon: "🔴", statusKey: "Backordered" },
  { label: "Not Received", countKey: "notReceived" as const, icon: "⏳", statusKey: "Not Received" },
  { label: "Ordered", countKey: "ordered" as const, icon: "📋", statusKey: "Ordered" },
  { label: "Received", countKey: "received" as const, icon: "✅", statusKey: "Received" },
  { label: "Returned", countKey: "returned" as const, icon: "↩️", statusKey: "Returned" },
  { label: "Sent Out", countKey: "sentOut" as const, icon: "🚚", statusKey: "Sent Out" },
  { label: "Paint/Stain", countKey: "sentToPaintStain" as const, icon: "🎨", statusKey: "Sent To Paint/Stain" },
  { label: "Stock", countKey: "stock" as const, icon: "🏪", statusKey: "Stock" },
];

export function StatusCards({ counts, activeFilter, onFilterChange }: StatusCardsProps) {
  return (
    <>
      {/* ── Mobile: compact chip strip ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 md:hidden scrollbar-hide">
        {cards.map((card) => {
          const isActive = activeFilter === card.statusKey;
          const count = counts[card.countKey];
          return (
            <button
              key={card.label}
              onClick={() => onFilterChange(isActive ? null : card.statusKey)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                ${isActive
                  ? "bg-[#6CC14C] text-white shadow-md"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                }`}
            >
              <span className="text-sm leading-none">{card.icon}</span>
              <span className="font-bold tabular-nums">{count}</span>
              <span className="hidden min-[400px]:inline">{card.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Desktop: wrap grid ── */}
      <div className="hidden md:flex md:flex-wrap gap-2">
        {cards.map((card) => {
          const isActive = activeFilter === card.statusKey;
          const count = counts[card.countKey];
          const cfg = card.statusKey ? getStatusConfig(card.statusKey) : null;
          return (
            <button
              key={card.label}
              onClick={() => onFilterChange(isActive ? null : card.statusKey)}
              className={`relative flex flex-col items-center justify-center p-3 min-w-[100px] rounded-xl border-2 transition-all duration-200 cursor-pointer
                ${isActive
                  ? `${cfg?.bg ?? "bg-gray-100 dark:bg-gray-700"} ${cfg?.text ?? "text-gray-800"} border-current shadow-lg scale-105`
                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md"
                }`}
            >
              <span className="text-lg mb-0.5">{card.icon}</span>
              <span className="text-2xl font-bold tabular-nums">{count.toLocaleString()}</span>
              <span className="text-xs font-medium opacity-80 leading-tight">{card.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
