"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useInventory } from "@/hooks/useInventory";
import { StatusCards } from "@/components/StatusCards";
import { SearchBar } from "@/components/SearchBar";
import { InventoryTable } from "@/components/InventoryTable";
import { ProductTotals, ProductTotalsBar } from "@/components/ProductTotals";
import type { InventoryItem } from "@/types/inventory";

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

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleFieldChange = useCallback((field: string) => {
    setSearchField(field);
  }, []);

  const handleStatusFilter = useCallback((status: string | null) => {
    setStatusFilter(status);
  }, []);

  // Filter items based on search and status
  const filteredItems = useMemo(() => {
    if (!data) return [];

    let items = data.items;

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
  }, [data, searchQuery, searchField, statusFilter]);

  // Loading state
  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
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
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
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
      <header className="bg-[#1e3a5f] text-white sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-4 py-2.5 sm:px-6 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/15 font-bold text-sm sm:text-base">
                N
              </div>
              <div>
                <h1 className="text-sm sm:text-lg font-bold leading-tight">
                  NWO Inventory
                </h1>
                <p className="text-[10px] sm:text-xs text-blue-200/70 hidden sm:block">
                  Renewal by Andersen — Northwest Ohio
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {data.lastUpdated && (
                <span className="text-[10px] sm:text-xs text-blue-200/60">
                  {timeAgo(data.lastUpdated)}
                </span>
              )}
              <button
                onClick={refresh}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-xs sm:text-sm font-medium bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
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
          {/* Search */}
          <div className="px-4 pt-3 pb-2">
            <SearchBar
              onSearch={handleSearch}
              onFieldChange={handleFieldChange}
              searchField={searchField}
              resultCount={filteredItems.length}
              totalCount={data.items.length}
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
            <ProductTotalsBar totals={data.productTotals} />
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

          {/* Search */}
          <SearchBar
            onSearch={handleSearch}
            onFieldChange={handleFieldChange}
            searchField={searchField}
            resultCount={filteredItems.length}
            totalCount={data.items.length}
          />

          {/* Content: Table + Sidebar */}
          <div className="flex gap-6">
            <div className="flex-1 min-w-0">
              <InventoryTable items={filteredItems} />
            </div>
            <div className="w-64 flex-shrink-0">
              <div className="sticky top-20">
                <ProductTotals totals={data.productTotals} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
