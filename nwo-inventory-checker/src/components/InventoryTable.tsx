"use client";

import { useState, useMemo } from "react";
import type { InventoryItem } from "@/types/inventory";
import { StatusBadge, StatusDot, getStatusConfig } from "./StatusBadge";

type SortField = keyof InventoryItem;
type SortDir = "asc" | "desc";

interface InventoryTableProps {
  items: InventoryItem[];
}

/** Parse the DD/MM/YYYY HH:mm:ss timestamp Orca returns into a comparable value */
function parseOrcaDate(raw: string): number {
  if (!raw) return 0;
  // DD/MM/YYYY HH:mm:ss
  const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (m) {
    return new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]).getTime();
  }
  // Fallback: try native Date parse
  const t = Date.parse(raw);
  return isNaN(t) ? 0 : t;
}

// ─── Mobile tile ───
function ItemTile({ item }: { item: InventoryItem }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = getStatusConfig(item.status);

  // Use description as the main title; fall back to name if no description
  const title = item.description || item.name || "Unnamed Item";
  // Only show name as sub-line when description exists (otherwise it's already the title)
  const subtitle = item.description && item.name ? item.name : null;

  return (
    <button
      onClick={() => setExpanded((v) => !v)}
      className={`w-full text-left rounded-xl border transition-all duration-150 overflow-hidden
        ${expanded
          ? "bg-white dark:bg-gray-800 border-[#6CC14C] dark:border-[#326222] shadow-lg"
          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 active:scale-[0.98]"
        }`}
    >
      {/* Color stripe + content */}
      <div className="flex">
        {/* Status color stripe */}
        <div className={`w-1.5 shrink-0 ${cfg.mobileBg} rounded-l-xl`} />

        <div className="flex-1 min-w-0 p-3 space-y-1">
          {/* Row 1: Item title (description or name) + status */}
          <div className="flex items-start justify-between gap-2">
            <span className="font-semibold text-[13px] text-gray-900 dark:text-white leading-tight flex-1 min-w-0 line-clamp-2">
              {title}
            </span>
            <StatusDot status={item.status} />
          </div>

          {/* Row 2: Customer name (when description is the title) */}
          {subtitle && (
            <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              {subtitle}
            </div>
          )}

          {/* Row 3: Key info chips */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
            {item.jobNumber && (
              <span>
                <span className="text-gray-400 dark:text-gray-500">Job </span>
                <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
                  {item.jobNumber}
                </span>
              </span>
            )}
            {item.customerPO && (
              <span>
                <span className="text-gray-400 dark:text-gray-500">PO </span>
                <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
                  {item.customerPO}
                </span>
              </span>
            )}
            {item.location && (
              <span className="inline-flex items-center gap-0.5">
                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-medium text-gray-700 dark:text-gray-300">{item.location}</span>
              </span>
            )}
          </div>

          {/* Expanded details */}
          {expanded && (
            <div className="pt-2 mt-1 border-t border-gray-100 dark:border-gray-700 space-y-1.5 animate-in fade-in duration-150">
              {item.vendor && (
                <div className="text-xs">
                  <span className="text-gray-400 dark:text-gray-500">Vendor: </span>
                  <span className="text-gray-700 dark:text-gray-300">{item.vendor}</span>
                </div>
              )}
              {item.changedOn && (
                <div className="text-xs">
                  <span className="text-gray-400 dark:text-gray-500">Updated: </span>
                  <span className="text-gray-700 dark:text-gray-300">{item.changedOn}</span>
                </div>
              )}
              {item.unitId && (
                <div className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
                  ID: {item.unitId}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
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
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 max-w-[300px] truncate">
                {item.description || "—"}
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
      // Default to desc for date, asc for everything else
      setSortDir(field === "changedOn" ? "desc" : "asc");
    }
  };

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      // Date sort for changedOn
      if (sortField === "changedOn") {
        const aTime = parseOrcaDate(a.changedOn);
        const bTime = parseOrcaDate(b.changedOn);
        const cmp = aTime - bTime;
        return sortDir === "asc" ? cmp : -cmp;
      }
      // String sort for everything else
      const aVal = (a[sortField] ?? "").toString().toLowerCase();
      const bVal = (b[sortField] ?? "").toString().toLowerCase();
      const cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [items, sortField, sortDir]);

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
      {/* ── Mobile: sort + tile list ── */}
      <div className="md:hidden space-y-2">
        {/* Sort controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">Sort</span>
            <select
              value={sortField}
              onChange={(e) => {
                const field = e.target.value as SortField;
                setSortField(field);
                setSortDir(field === "changedOn" ? "desc" : "asc");
              }}
              className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#6CC14C]"
            >
              <option value="changedOn">Newest First</option>
              <option value="name">Customer</option>
              <option value="description">Description</option>
              <option value="status">Status</option>
              <option value="jobNumber">Job #</option>
              <option value="customerPO">PO #</option>
              <option value="location">Location</option>
            </select>
            <button
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400"
            >
              {sortField === "changedOn"
                ? sortDir === "desc" ? "New→Old" : "Old→New"
                : sortDir === "asc" ? "A→Z" : "Z→A"
              }
            </button>
          </div>
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            {items.length.toLocaleString()} items
          </span>
        </div>

        {/* Tile list */}
        <div className="space-y-1.5">
          {sorted.map((item, i) => (
            <ItemTile key={`${item.jobNumber}-${item.unitId}-${i}`} item={item} />
          ))}
        </div>
      </div>

      {/* ── Desktop: table ── */}
      <div className="hidden md:block">
        <DesktopTable items={sorted} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
      </div>
    </>
  );
}
