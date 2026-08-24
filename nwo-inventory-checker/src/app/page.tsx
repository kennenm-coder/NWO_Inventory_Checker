"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useInventory } from "@/hooks/useInventory";
import { StatusCards } from "@/components/StatusCards";
import { SearchBar } from "@/components/SearchBar";
import { InventoryTable } from "@/components/InventoryTable";
import { ProductTotals, ProductTotalsBar } from "@/components/ProductTotals";
import { computeProductTotals } from "@/lib/products";
import type { InventoryItem, InventorySource } from "@/types/inventory";

type SourceFilter = "all" | InventorySource;

function SourceToggle({
  value,
  onChange,
  counts,
}: {
  value: SourceFilter;
  onChange: (v: SourceFilter) => void;
  counts: { all: number; main: number; trim: number };
}) {
  const options: { key: SourceFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "main", label: "Inventory" },
    { key: "trim", label: "Trim" },
  ];
  return (
    <div className="inline-flex shrink-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-0.5">
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              active
                ? "bg-[#6CC14C] text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            {opt.label}
            <span className={`ml-1 tabular-nums ${active ? "text-white/80" : "text-gray-400 dark:text-gray-500"}`}>
              {counts[opt.key].toLocaleString()}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Register service worker for PWA (production only)
function useServiceWorker() {
  useEffect(() => {
    if (
      "serviceWorker" in navigator &&
      window.location.hostname !== "localhost"
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs === 1) return "1 hour ago";
  return `${hrs} hours ago`;
}

export default function Home() {
  useServiceWorker();
  const { data, loading, error, refresh } = useInventory();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleFieldChange = useCallback((field: string) => {
    setSearchField(field);
  }, []);

  const handleStatusFilter = useCallback((status: string | null) => {
    setStatusFilter(status);
  }, []);

  // Source counts for the toggle (main / trim / all)
  const sourceCounts = useMemo(() => {
    const items = data?.items ?? [];
    const trim = items.reduce((n, i) => (i.source === "trim" ? n + 1 : n), 0);
    return { all: items.length, main: items.length - trim, trim };
  }, [data]);

  // Filter items based on source, search, and status
  const filteredItems = useMemo(() => {
    if (!data) return [];

    let items = data.items;

    // Source filter (Inventory / Trim / All)
    if (sourceFilter !== "all") {
      items = items.filter((item) => item.source === sourceFilter);
    }

    // Status filter
    if (statusFilter) {
      items = items.filter((item) => item.status === statusFilter);
    }

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter((item) => {
        if (searchField === "all") {
          return Object.values(item).some(
            (val) => val && val.toString().toLowerCase().includes(q)
          );
        }
        const val = item[searchField as keyof InventoryItem];
        return val && val.toString().toLowerCase().includes(q);
      });
    }

    return items;
  }, [data, searchQuery, searchField, statusFilter, sourceFilter]);

  // Product totals reflect whatever is currently filtered/searched
  const productTotals = useMemo(
    () => computeProductTotals(filteredItems),
    [filteredItems]
  );

  const sourceTotal =
    sourceFilter === "all" ? sourceCounts.all : sourceCounts[sourceFilter];

  // Loading state
  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#6CC14C]/10 mb-4">
            <svg className="w-8 h-8 text-[#6CC14C] animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading inventory...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Fetching data from Orca</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md px-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Failed to load inventory</p>
          <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>
          <button
            onClick={refresh}
            className="mt-4 px-4 py-2 bg-[#6CC14C] text-white rounded-lg hover:bg-[#326222] transition-colors text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ── Header ── */}
      <header className="bg-[#1a1a1a] text-white sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-4 py-2.5 sm:px-6 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* Barcode icon */}
              <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#6CC14C]/15">
                <svg className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-[#6CC14C]" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="2" y="4" width="2" height="16" rx="0.5" />
                  <rect x="5.5" y="4" width="1" height="16" rx="0.3" />
                  <rect x="8" y="4" width="2.5" height="16" rx="0.5" />
                  <rect x="12" y="4" width="1.5" height="16" rx="0.3" />
                  <rect x="15" y="4" width="2" height="16" rx="0.5" />
                  <rect x="18.5" y="4" width="1" height="16" rx="0.3" />
                  <rect x="21" y="4" width="1" height="16" rx="0.3" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm sm:text-lg font-bold leading-tight">
                  NWO Inventory
                </h1>
                <p className="text-[10px] sm:text-xs text-gray-400 hidden sm:block">
                  Renewal by Andersen — Northwest Ohio
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {data.lastUpdated && (
                <span className="text-[10px] sm:text-xs text-gray-500">
                  {timeAgo(data.lastUpdated)}
                </span>
              )}
              <button
                onClick={refresh}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-xs sm:text-sm font-medium bg-[#6CC14C]/15 text-[#6CC14C] hover:bg-[#6CC14C]/25 transition-colors disabled:opacity-50"
              >
                <svg
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? "animate-spin" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="max-w-[1600px] mx-auto">
        {/* Mobile layout — stacked, full-bleed */}
        <div className="md:hidden">
          {/* Source toggle */}
          <div className="px-4 pt-3 flex justify-center">
            <SourceToggle value={sourceFilter} onChange={setSourceFilter} counts={sourceCounts} />
          </div>

          {/* Search */}
          <div className="px-4 pt-2 pb-2">
            <SearchBar
              onSearch={handleSearch}
              onFieldChange={handleFieldChange}
              searchField={searchField}
              resultCount={filteredItems.length}
              totalCount={sourceTotal}
            />
          </div>

          {/* Status filter chips */}
          <div className="px-0 pb-2">
            <StatusCards
              counts={data.statusCounts}
              activeFilter={statusFilter}
              onFilterChange={handleStatusFilter}
            />
          </div>

          {/* Product totals bar */}
          <div className="px-4 pb-2">
            <ProductTotalsBar totals={productTotals} />
          </div>

          {/* Inventory tiles */}
          <div className="px-4 pb-6">
            <InventoryTable items={filteredItems} />
          </div>
        </div>

        {/* Desktop layout — padded, with sidebar */}
        <div className="hidden md:block px-6 py-6 space-y-6">
          {/* Status cards */}
          <StatusCards
            counts={data.statusCounts}
            activeFilter={statusFilter}
            onFilterChange={handleStatusFilter}
          />

          {/* Search + source toggle */}
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <SearchBar
                onSearch={handleSearch}
                onFieldChange={handleFieldChange}
                searchField={searchField}
                resultCount={filteredItems.length}
                totalCount={sourceTotal}
              />
            </div>
            <SourceToggle value={sourceFilter} onChange={setSourceFilter} counts={sourceCounts} />
          </div>

          {/* Content: Table + Sidebar */}
          <div className="flex gap-6">
            <div className="flex-1 min-w-0">
              <InventoryTable items={filteredItems} />
            </div>
            <div className="w-64 flex-shrink-0">
              <div className="sticky top-20">
                <ProductTotals totals={productTotals} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
