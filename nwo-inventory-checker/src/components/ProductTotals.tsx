"use client";

import type { ProductTotals as ProductTotalsType } from "@/types/inventory";

interface ProductTotalsProps {
  totals: ProductTotalsType;
}

const rows = [
  { label: "Windows", key: "totalWindows" as const, icon: "🪟" },
  { label: "Patio Doors", key: "totalPD" as const, icon: "🚪" },
  { label: "Entry Doors", key: "totalED" as const, icon: "🏠" },
  { label: "Misc", key: "totalMisc" as const, icon: "📦" },
];

/** Desktop sidebar version */
export function ProductTotals({ totals }: ProductTotalsProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
        Product Totals
      </h3>
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <span>{row.icon}</span>
              {row.label}
            </span>
            <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
              {totals[row.key].toLocaleString()}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between px-2">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Total Items
        </span>
        <span className="text-lg font-bold tabular-nums text-blue-600 dark:text-blue-400">
          {totals.totalItems.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

/** Compact horizontal bar for mobile */
export function ProductTotalsBar({ totals }: ProductTotalsProps) {
  return (
    <div className="flex items-center gap-3 overflow-x-auto px-1 py-1 scrollbar-hide">
      {rows.map((row) => (
        <span
          key={row.label}
          className="shrink-0 flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400"
        >
          <span>{row.icon}</span>
          <span className="font-bold tabular-nums text-gray-700 dark:text-gray-300">
            {totals[row.key].toLocaleString()}
          </span>
        </span>
      ))}
      <span className="shrink-0 ml-auto text-[11px] font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
        Total: {totals.totalItems.toLocaleString()}
      </span>
    </div>
  );
}
