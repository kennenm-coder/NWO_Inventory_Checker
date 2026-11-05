"use client";

import { useEffect, useRef } from "react";
import type { InventorySource, ProductTotals } from "@/types/inventory";
import { searchFields } from "@/components/SearchBar";
import type { SortDir, SortField } from "@/lib/sort";

export type SourceFilter = "all" | InventorySource;

export const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: "changedOn", label: "Newest" },
  { field: "name", label: "Customer" },
  { field: "status", label: "Status" },
  { field: "jobNumber", label: "Job #" },
  { field: "customerPO", label: "PO #" },
  { field: "location", label: "Location" },
  { field: "description", label: "Description" },
];

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  resultCount: number;
  sourceFilter: SourceFilter;
  onSourceFilter: (s: SourceFilter) => void;
  sourceCounts: { all: number; main: number; trim: number };
  searchField: string;
  onFieldChange: (f: string) => void;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
  onToggleDir: () => void;
  totals: ProductTotals;
  updatedLabel: string;
  loading: boolean;
  onRefresh: () => void;
  onReset: () => void;
  hasFilters: boolean;
}

// One selectable pill. 44px tall so a thumb can hit it.
function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[44px] rounded-xl border px-3.5 text-[14px] font-medium touch-manipulation transition-colors ${
        active
          ? "border-[#6CC14C] bg-[#6CC14C] text-white"
          : "border-gray-200 bg-white text-gray-700 active:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:active:bg-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{title}</h3>
      {children}
    </section>
  );
}

const TOTAL_ROWS = [
  { label: "Windows", key: "totalWindows" as const },
  { label: "Patio doors", key: "totalPD" as const },
  { label: "Entry doors", key: "totalED" as const },
  { label: "Misc", key: "totalMisc" as const },
  { label: "Trim", key: "trimOrders" as const },
];

export function FilterSheet(p: FilterSheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  // Held in a ref so the effect below depends only on `open`: depending on the whole
  // props object would re-run it every render and keep stealing focus.
  const onCloseRef = useRef(p.onClose);
  onCloseRef.current = p.onClose;

  // While the sheet is up the page behind it must not scroll, and Escape closes it.
  useEffect(() => {
    if (!p.open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [p.open]);

  if (!p.open) return null;

  const sources: { key: SourceFilter; label: string }[] = [
    { key: "all", label: `All ${p.sourceCounts.all.toLocaleString()}` },
    { key: "main", label: `Inventory ${p.sourceCounts.main.toLocaleString()}` },
    { key: "trim", label: `Trim ${p.sourceCounts.trim.toLocaleString()}` },
  ];
  const isDate = p.sortField === "changedOn";

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Filters and sorting">
      {/* backdrop */}
      <button
        type="button"
        aria-label="Close filters"
        onClick={p.onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/55"
        style={{ minHeight: 0 }}
      />

      <div className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-2xl bg-gray-50 shadow-2xl dark:bg-gray-900 animate-in">
        {/* grab handle + title */}
        <div className="shrink-0 px-4 pt-2">
          <div className="mx-auto h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" aria-hidden="true" />
          <div className="flex items-center justify-between py-2">
            <h2 className="text-[17px] font-bold text-gray-900 dark:text-white">Filters &amp; sort</h2>
            <button
              ref={closeRef}
              type="button"
              onClick={p.onClose}
              className="flex h-11 w-11 items-center justify-center rounded-full text-gray-500 active:bg-gray-200 dark:text-gray-400 dark:active:bg-gray-700"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* scrolling body */}
        <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 pb-4">
          <Section title="Show">
            <div className="flex flex-wrap gap-2">
              {sources.map((s) => (
                <Pill key={s.key} active={p.sourceFilter === s.key} onClick={() => p.onSourceFilter(s.key)}>
                  {s.label}
                </Pill>
              ))}
            </div>
          </Section>

          <Section title="Search in">
            <div className="flex flex-wrap gap-2">
              {searchFields.map((f) => (
                <Pill key={f.value} active={p.searchField === f.value} onClick={() => p.onFieldChange(f.value)}>
                  {f.short}
                </Pill>
              ))}
            </div>
          </Section>

          <Section title="Sort by">
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map((o) => (
                <Pill key={o.field} active={p.sortField === o.field} onClick={() => p.onSort(o.field)}>
                  {o.label}
                </Pill>
              ))}
            </div>
            <button
              type="button"
              onClick={p.onToggleDir}
              className="mt-1 flex min-h-[44px] items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 text-[14px] font-medium text-gray-700 touch-manipulation active:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:active:bg-gray-700"
            >
              <svg
                className={`h-4 w-4 transition-transform ${p.sortDir === "asc" ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              {isDate
                ? p.sortDir === "desc" ? "Newest first" : "Oldest first"
                : p.sortDir === "asc" ? "A to Z" : "Z to A"}
            </button>
          </Section>

          <Section title="Totals for these results">
            <div className="grid grid-cols-5 gap-1.5 rounded-xl border border-gray-200 bg-white p-2 text-center dark:border-gray-700 dark:bg-gray-800">
              {TOTAL_ROWS.map((r) => (
                <div key={r.key}>
                  <div className="text-[16px] font-bold tabular-nums text-gray-900 dark:text-gray-100">
                    {p.totals[r.key].toLocaleString()}
                  </div>
                  <div className="text-[10px] leading-tight text-gray-500 dark:text-gray-400">{r.label}</div>
                </div>
              ))}
            </div>
          </Section>

          <div className="flex items-center justify-between rounded-xl bg-white px-3.5 py-2 text-[13px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <span>Updated {p.updatedLabel}</span>
            <button
              type="button"
              onClick={p.onRefresh}
              disabled={p.loading}
              className="min-h-[44px] rounded-lg px-3 font-semibold text-[#326222] touch-manipulation active:bg-gray-100 disabled:opacity-50 dark:text-[#6CC14C] dark:active:bg-gray-700"
            >
              {p.loading ? "Refreshing…" : "Refresh now"}
            </button>
          </div>
        </div>

        {/* footer actions stay put while the body scrolls */}
        <div
          className="flex shrink-0 gap-2 border-t border-gray-200 bg-gray-50 px-4 pt-3 dark:border-gray-700 dark:bg-gray-900"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={p.onReset}
            disabled={!p.hasFilters}
            className="min-h-[48px] rounded-xl border border-gray-300 px-4 text-[15px] font-semibold text-gray-700 touch-manipulation active:bg-gray-100 disabled:opacity-40 dark:border-gray-600 dark:text-gray-200 dark:active:bg-gray-700"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={p.onClose}
            className="min-h-[48px] flex-1 rounded-xl bg-[#6CC14C] px-4 text-[15px] font-bold text-white touch-manipulation active:bg-[#326222]"
          >
            Show {p.resultCount.toLocaleString()} {p.resultCount === 1 ? "item" : "items"}
          </button>
        </div>
      </div>
    </div>
  );
}
