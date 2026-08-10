"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  onFieldChange: (field: string) => void;
  searchField: string;
  resultCount: number;
  totalCount: number;
}

const fields = [
  { value: "all", label: "All Fields", short: "All" },
  { value: "name", label: "Customer Name", short: "Name" },
  { value: "jobNumber", label: "Job Number", short: "Job #" },
  { value: "customerPO", label: "PO Number", short: "PO #" },
  { value: "vendor", label: "Vendor", short: "Vendor" },
  { value: "description", label: "Description", short: "Desc" },
  { value: "location", label: "Location", short: "Loc" },
];

export function SearchBar({
  onSearch,
  onFieldChange,
  searchField,
  resultCount,
  totalCount,
}: SearchBarProps) {
  const [inputValue, setInputValue] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const debouncedSearch = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSearch(value);
      }, 200);
    },
    [onSearch]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    debouncedSearch(value);
  };

  const handleClear = () => {
    setInputValue("");
    onSearch("");
  };

  return (
    <div className="flex items-center gap-2">
      {/* Field selector — compact on mobile */}
      <select
        value={searchField}
        onChange={(e) => onFieldChange(e.target.value)}
        className="shrink-0 px-2 py-2 sm:px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {fields.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      {/* Search input */}
      <div className="relative flex-1 min-w-0">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          placeholder="Search inventory..."
          className="w-full pl-9 pr-9 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {inputValue && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Result count */}
      <span className="shrink-0 text-xs sm:text-sm text-gray-400 dark:text-gray-500 tabular-nums whitespace-nowrap">
        {resultCount === totalCount
          ? `${totalCount.toLocaleString()}`
          : `${resultCount.toLocaleString()}/${totalCount.toLocaleString()}`}
      </span>
    </div>
  );
}
