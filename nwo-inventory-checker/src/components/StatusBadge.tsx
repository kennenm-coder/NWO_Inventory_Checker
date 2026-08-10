"use client";

import type { InventoryStatus } from "@/types/inventory";

export const statusConfig: Record<
  string,
  { bg: string; text: string; ring: string; dot: string; mobileBg: string }
> = {
  Backordered: {
    bg: "bg-red-100 dark:bg-red-900/40",
    text: "text-red-800 dark:text-red-300",
    ring: "ring-red-200 dark:ring-red-800",
    dot: "bg-red-500",
    mobileBg: "bg-red-500",
  },
  "Not Received": {
    bg: "bg-amber-100 dark:bg-amber-900/40",
    text: "text-amber-800 dark:text-amber-300",
    ring: "ring-amber-200 dark:ring-amber-800",
    dot: "bg-amber-500",
    mobileBg: "bg-amber-500",
  },
  Ordered: {
    bg: "bg-blue-100 dark:bg-blue-900/40",
    text: "text-blue-800 dark:text-blue-300",
    ring: "ring-blue-200 dark:ring-blue-800",
    dot: "bg-blue-500",
    mobileBg: "bg-blue-500",
  },
  Received: {
    bg: "bg-green-100 dark:bg-green-900/40",
    text: "text-green-800 dark:text-green-300",
    ring: "ring-green-200 dark:ring-green-800",
    dot: "bg-green-500",
    mobileBg: "bg-green-500",
  },
  Returned: {
    bg: "bg-purple-100 dark:bg-purple-900/40",
    text: "text-purple-800 dark:text-purple-300",
    ring: "ring-purple-200 dark:ring-purple-800",
    dot: "bg-purple-500",
    mobileBg: "bg-purple-500",
  },
  "Sent Out": {
    bg: "bg-teal-100 dark:bg-teal-900/40",
    text: "text-teal-800 dark:text-teal-300",
    ring: "ring-teal-200 dark:ring-teal-800",
    dot: "bg-teal-500",
    mobileBg: "bg-teal-500",
  },
  "Sent To Paint/Stain": {
    bg: "bg-orange-100 dark:bg-orange-900/40",
    text: "text-orange-800 dark:text-orange-300",
    ring: "ring-orange-200 dark:ring-orange-800",
    dot: "bg-orange-500",
    mobileBg: "bg-orange-500",
  },
  Stock: {
    bg: "bg-slate-100 dark:bg-slate-800/40",
    text: "text-slate-700 dark:text-slate-300",
    ring: "ring-slate-200 dark:ring-slate-700",
    dot: "bg-slate-500",
    mobileBg: "bg-slate-500",
  },
};

const defaultConfig = {
  bg: "bg-gray-100 dark:bg-gray-800/40",
  text: "text-gray-700 dark:text-gray-300",
  ring: "ring-gray-200 dark:ring-gray-700",
  dot: "bg-gray-500",
  mobileBg: "bg-gray-500",
};

export function getStatusConfig(status: string) {
  return statusConfig[status] ?? defaultConfig;
}

export function StatusBadge({ status }: { status: InventoryStatus }) {
  const colors = statusConfig[status] ?? defaultConfig;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset ${colors.bg} ${colors.text} ${colors.ring}`}
    >
      {status}
    </span>
  );
}

/** Compact dot + label for mobile tiles */
export function StatusDot({ status }: { status: InventoryStatus }) {
  const colors = statusConfig[status] ?? defaultConfig;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${colors.dot} shrink-0`} />
      <span className={`text-[11px] font-semibold ${colors.text}`}>
        {status}
      </span>
    </span>
  );
}
