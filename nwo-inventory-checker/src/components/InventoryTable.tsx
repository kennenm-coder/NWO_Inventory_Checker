"use client";

import { useState, useMemo } from "react";
import type { InventoryItem } from "@/types/inventory";
import { StatusBadge } from "./StatusBadge";
import { TrimTag } from "./TrimTag";
import { defaultSortDir, sortItems, type SortDir, type SortField } from "@/lib/sort";

interface InventoryTableProps {
  items: InventoryItem[];
}

// ─── Desktop table ───
function DesktopTable({
  items,
  sortField,
  sortDir,
  onSort,
}: {
  items: InventoryItem[];
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
}) {
  const columns: { key: SortField; label: string; className?: string }[] = [
    { key: "description", label: "Description", className: "min-w-[200px]" },
    { key: "name", label: "Customer", className: "min-w-[140px]" },
    { key: "status", label: "Status", className: "min-w-[130px]" },
    { key: "jobNumber", label: "Job #", className: "min-w-[100px]" },
    { key: "customerPO", label: "PO #", className: "min-w-[110px]" },
    { key: "location", label: "Location", className: "min-w-[100px]" },
    { key: "vendor", label: "Vendor", className: "min-w-[80px]" },
    { key: "changedOn", label: "Updated", className: "min-w-[120px]" },
  ];

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-3 h-3 ml-1 opacity-30" fill="currentColor" viewBox="0 0 20 20">
          <path d="M5 8l5-5 5 5H5zm0 4l5 5 5-5H5z" />
        </svg>
      );
    }
    return sortDir === "asc" ? (
      <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
        <path d="M5 12l5-5 5 5H5z" />
      </svg>
    ) : (
      <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
        <path d="M5 8l5 5 5-5H5z" />
      </svg>
    );
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-200 select-none ${col.className ?? ""}`}
                onClick={() => onSort(col.key)}
              >
                <span className="inline-flex items-center">
                  {col.label}
                  <SortIcon field={col.key} />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {items.map((item, i) => (
            <tr
              key={`${item.jobNumber}-${item.unitId}-${i}`}
              className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
            >
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 max-w-[300px]">
                <span className="flex items-center gap-1.5 min-w-0">
                  {item.source === "trim" && <TrimTag item={item} />}
                  <span className="truncate">{item.description || "—"}</span>
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                {item.name || "—"}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={item.status} />
              </td>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-mono text-xs">
                {item.jobNumber || "—"}
              </td>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-mono text-xs">
                {item.customerPO || "—"}
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                {item.location || "—"}
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                {item.vendor || "—"}
              </td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                {item.changedOn || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main component ───
export function InventoryTable({ items }: InventoryTableProps) {
  // Default: newest first (by changedOn date)
  const [sortField, setSortField] = useState<SortField>("changedOn");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(defaultSortDir(field));
    }
  };

  const sorted = useMemo(() => sortItems(items, sortField, sortDir), [items, sortField, sortDir]);

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500 dark:text-gray-400">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <p className="text-lg font-medium">No items found</p>
        <p className="text-sm mt-1">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Desktop: table ── */}
      <div className="hidden md:block">
        <DesktopTable items={sorted} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
      </div>
    </>
  );
}
