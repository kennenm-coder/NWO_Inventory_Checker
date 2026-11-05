"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { InventoryItem, ProductTotals, StatusCounts } from "@/types/inventory";
import { statusChips } from "@/components/StatusCards";
import { defaultSortDir, sortItems, type SortDir, type SortField } from "@/lib/sort";
import { timeAgo } from "@/lib/time";
import { FilterSheet, SORT_OPTIONS, type SourceFilter } from "./FilterSheet";
import { ResultGroups } from "./ResultGroups";

// The phone layout. Desktop keeps its table and sidebar; this is built around one
// job on a small screen: type a customer, job or PO and read the status + location.
//
//   - ONE pinned block (search + status chips) so the search box never scrolls away.
//   - Everything else that used to be stacked above the results (source toggle,
//     which field to search, sort, product totals, refresh) lives in a bottom sheet.
//   - Results are cards per customer+job, drawn 40 at a time as you scroll: the
//     full list is 2,000+ rows and drawing them all made the phone crawl.

const BATCH = 40;

interface MobileInventoryProps {
  /** Already filtered by search / status / source */
  items: InventoryItem[];
  totalCount: number;
  statusCounts: StatusCounts;
  productTotals: ProductTotals;
  sourceCounts: { all: number; main: number; trim: number };
  searchQuery: string;
  onSearch: (q: string) => void;
  searchField: string;
  onFieldChange: (f: string) => void;
  statusFilter: string | null;
  onStatusFilter: (s: string | null) => void;
  sourceFilter: SourceFilter;
  onSourceFilter: (s: SourceFilter) => void;
  lastUpdated?: string;
  loading: boolean;
  onRefresh: () => void;
  onClearAll: () => void;
}

// ── search box ──────────────────────────────────────────────────────────────

function MobileSearch({ onSearch }: { onSearch: (q: string) => void }) {
  const [value, setValue] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const change = (v: string) => {
    setValue(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearch(v), 200);
  };

  return (
    <div className="relative flex-1 min-w-0">
      <svg
        className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
        fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        onChange={(e) => change(e.target.value)}
        // Enter dismisses the keyboard so the results are actually visible.
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        placeholder="Name, job #, PO #…"
        aria-label="Search inventory"
        // 16px: anything smaller makes iOS zoom the whole page when the box is focused.
        className="h-12 w-full rounded-xl border border-gray-300 bg-white pl-11 pr-12 text-[16px] text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#6CC14C] dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => { setValue(""); if (timer.current) clearTimeout(timer.current); onSearch(""); }}
          aria-label="Clear search"
          className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-gray-400 active:text-gray-600"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ── the screen ──────────────────────────────────────────────────────────────

export function MobileInventory(props: MobileInventoryProps) {
  const {
    items, totalCount, statusCounts, productTotals, sourceCounts,
    searchField, onFieldChange, statusFilter, onStatusFilter, sourceFilter, onSourceFilter,
    lastUpdated, loading, onRefresh, onClearAll, searchQuery, onSearch,
  } = props;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>("changedOn");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [visible, setVisible] = useState(BATCH);
  const [showTop, setShowTop] = useState(false);
  // Bumped on "clear everything" so the search box (which keeps its own text while it
  // debounces) starts over empty.
  const [searchKey, setSearchKey] = useState(0);

  const sorted = useMemo(() => sortItems(items, sortField, sortDir), [items, sortField, sortDir]);

  // Back to the first batch when what is being shown changes (not when the data merely refreshes).
  const viewSig = `${searchQuery}|${searchField}|${statusFilter}|${sourceFilter}|${sortField}|${sortDir}`;
  const lastSig = useRef(viewSig);
  useEffect(() => {
    if (lastSig.current !== viewSig) {
      lastSig.current = viewSig;
      setVisible(BATCH);
      window.scrollTo({ top: 0 });
    }
  }, [viewSig]);

  // Draw the next batch as the end of the list nears the screen.
  const sentinel = useRef<HTMLDivElement>(null);
  const total = sorted.length;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || visible >= total) return;
    const io = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setVisible((v) => Math.min(v + BATCH, total)); },
      { rootMargin: "900px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, total]);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 900);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const pickSort = useCallback((field: SortField) => {
    setSortField(field);
    setSortDir(defaultSortDir(field));
  }, []);

  const sortLabel = SORT_OPTIONS.find((o) => o.field === sortField)?.label ?? "Newest";
  const sortIsDefault = sortField === "changedOn" && sortDir === "desc";
  // What the Filters button counts: the things you cannot see on the main screen.
  const hiddenActive = (sourceFilter !== "all" ? 1 : 0) + (searchField !== "all" ? 1 : 0) + (sortIsDefault ? 0 : 1);
  const hasFilters = !!searchQuery.trim() || !!statusFilter || sourceFilter !== "all" || searchField !== "all" || !sortIsDefault;

  const clearAll = () => {
    onClearAll();
    setSortField("changedOn");
    setSortDir("desc");
    setSearchKey((k) => k + 1);
  };

  const updatedLabel = lastUpdated ? timeAgo(lastUpdated) : "—";

  return (
    <div className="min-h-screen">
      {/* ── Title bar (scrolls away; the search below stays) ── */}
      <header
        className="bg-[#1a1a1a] text-white"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#6CC14C]/15">
              <svg className="h-5 w-5 text-[#6CC14C]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="2" y="4" width="2" height="16" rx="0.5" />
                <rect x="5.5" y="4" width="1" height="16" rx="0.3" />
                <rect x="8" y="4" width="2.5" height="16" rx="0.5" />
                <rect x="12" y="4" width="1.5" height="16" rx="0.3" />
                <rect x="15" y="4" width="2" height="16" rx="0.5" />
                <rect x="18.5" y="4" width="1" height="16" rx="0.3" />
                <rect x="21" y="4" width="1" height="16" rx="0.3" />
              </svg>
            </div>
            <h1 className="truncate text-[17px] font-bold">NWO Inventory</h1>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-gray-400">{updatedLabel}</span>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              aria-label="Refresh"
              className="flex h-11 w-11 items-center justify-center rounded-lg text-[#6CC14C] touch-manipulation active:bg-white/10 disabled:opacity-50"
            >
              <svg className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* On a notched phone running as a home-screen app the page draws under the status
          bar. This strip keeps that area dark, and the pinned bar sits just below it. */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-40 bg-[#1a1a1a]"
        style={{ height: "env(safe-area-inset-top)" }}
        aria-hidden="true"
      />

      {/* ── Pinned: search + filters button + status chips ── */}
      <div
        className="sticky z-30 border-b border-gray-200 bg-gray-50/95 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95"
        style={{ top: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center gap-2 px-3 pt-2.5">
          <MobileSearch key={searchKey} onSearch={onSearch} />
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label={`Filters and sort${hiddenActive ? `, ${hiddenActive} active` : ""}`}
            className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-700 touch-manipulation active:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:active:bg-gray-700"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M6 12h12M10 18h4" />
            </svg>
            {hiddenActive > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#6CC14C] px-1 text-[11px] font-bold text-white">
                {hiddenActive}
              </span>
            )}
          </button>
        </div>

        {/* Status chips. The right-edge fade says "more this way" — without it the
            cut-off chip just looked broken. */}
        <div className="relative">
          <div
            className="scrollbar-hide flex gap-2 overflow-x-auto px-3 py-2.5"
            style={{ scrollSnapType: "x proximity", scrollPaddingInline: "0.75rem" }}
            role="group"
            aria-label="Filter by status"
          >
            {statusChips.map((chip) => {
              const active = statusFilter === chip.statusKey;
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => onStatusFilter(active ? null : chip.statusKey)}
                  aria-pressed={active}
                  style={{ scrollSnapAlign: "start" }}
                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium touch-manipulation transition-colors ${
                    active
                      ? "bg-[#6CC14C] text-white shadow-sm"
                      : "border border-gray-200 bg-white text-gray-700 active:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:active:bg-gray-700"
                  }`}
                >
                  <span className="font-bold tabular-nums">{statusCounts[chip.countKey].toLocaleString()}</span>
                  <span>{chip.label}</span>
                </button>
              );
            })}
            <span className="w-6 shrink-0" aria-hidden="true" />
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-gray-50 to-transparent dark:from-gray-900"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* ── Result line ── */}
      <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-1.5 text-[12px] text-gray-500 dark:text-gray-400">
        <span aria-live="polite">
          <span className="font-semibold tabular-nums text-gray-700 dark:text-gray-300">{total.toLocaleString()}</span>
          {total !== totalCount ? ` of ${totalCount.toLocaleString()}` : ""} {total === 1 ? "item" : "items"}
          {!sortIsDefault ? ` · by ${sortLabel.toLowerCase()}` : ""}
        </span>
        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="flex min-h-[36px] items-center rounded-lg px-2 font-semibold text-[#326222] touch-manipulation active:bg-gray-200 dark:text-[#6CC14C] dark:active:bg-gray-700"
          >
            Clear all
          </button>
        )}
      </div>

      {/* ── Results ── */}
      <div className="px-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 5rem)" }}>
        {total === 0 ? (
          <div className="px-6 py-16 text-center text-gray-500 dark:text-gray-400">
            <svg className="mx-auto mb-3 h-12 w-12 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-[17px] font-medium text-gray-700 dark:text-gray-300">Nothing found</p>
            <p className="mt-1 text-[14px]">
              {searchQuery.trim() ? `No match for “${searchQuery.trim()}”.` : "No items match these filters."}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearAll}
                className="mt-4 min-h-[48px] rounded-xl bg-[#6CC14C] px-5 text-[15px] font-bold text-white touch-manipulation active:bg-[#326222]"
              >
                Clear search &amp; filters
              </button>
            )}
          </div>
        ) : (
          <>
            <ResultGroups items={sorted.slice(0, visible)} />
            {visible < total && (
              <div ref={sentinel} className="flex justify-center py-6">
                <button
                  type="button"
                  onClick={() => setVisible((v) => Math.min(v + BATCH, total))}
                  className="min-h-[44px] rounded-xl border border-gray-300 px-5 text-[14px] font-semibold text-gray-600 touch-manipulation active:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:active:bg-gray-700"
                >
                  Show more · {(total - visible).toLocaleString()} left
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Back to top ── */}
      {showTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          className="fixed right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#1a1a1a] text-white shadow-lg touch-manipulation active:bg-black"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        resultCount={total}
        sourceFilter={sourceFilter}
        onSourceFilter={onSourceFilter}
        sourceCounts={sourceCounts}
        searchField={searchField}
        onFieldChange={onFieldChange}
        sortField={sortField}
        sortDir={sortDir}
        onSort={pickSort}
        onToggleDir={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
        totals={productTotals}
        updatedLabel={updatedLabel}
        loading={loading}
        onRefresh={onRefresh}
        onReset={clearAll}
        hasFilters={hasFilters}
      />
    </div>
  );
}
