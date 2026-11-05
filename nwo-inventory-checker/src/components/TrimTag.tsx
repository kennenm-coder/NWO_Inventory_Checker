import type { InventoryItem } from "@/types/inventory";

/**
 * Small pill marking a trim row. A row read from a vendor's order sheet says which
 * vendor, so it reads differently from a bundle on a rack (the Orca trim sheet).
 */
export function TrimTag({ item }: { item: InventoryItem }) {
  const vendor = item.feed === "vendor";
  return (
    <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-[#6CC14C]/15 text-[#326222] dark:text-[#6CC14C]">
      {vendor ? `Trim · ${item.vendor}` : "Trim"}
    </span>
  );
}
