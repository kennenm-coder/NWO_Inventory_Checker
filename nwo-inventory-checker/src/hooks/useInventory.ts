"use client";

import { useState, useEffect, useCallback } from "react";
import type { InventoryData } from "@/types/inventory";

export function useInventory() {
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (refresh = false) => {
    try {
      setError(null);
      const url = refresh ? "/api/inventory?refresh=true" : "/api/inventory";
      const res = await fetch(url);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${res.status}`);
      }

      const json: InventoryData = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(true);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchData(true);
  }, [fetchData]);

  return { data, loading, error, refresh };
}
