import type { InventoryItem } from "@/types/inventory";

export type SortField = keyof InventoryItem;
export type SortDir = "asc" | "desc";

/** Parse the DD/MM/YYYY HH:mm:ss timestamp Orca returns (or a plain M/D/YYYY from a vendor sheet) into a comparable value */
export function parseOrcaDate(raw: string): number {
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

/** Default direction when a field is first chosen: newest first for dates, A-Z for everything else */
export function defaultSortDir(field: SortField): SortDir {
  return field === "changedOn" ? "desc" : "asc";
}

/** A sorted copy. Dates compare as dates, everything else as natural-order text. */
export function sortItems(items: InventoryItem[], field: SortField, dir: SortDir): InventoryItem[] {
  return [...items].sort((a, b) => {
    if (field === "changedOn") {
      const cmp = parseOrcaDate(a.changedOn) - parseOrcaDate(b.changedOn);
      return dir === "asc" ? cmp : -cmp;
    }
    const aVal = (a[field] ?? "").toString().toLowerCase();
    const bVal = (b[field] ?? "").toString().toLowerCase();
    const cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
    return dir === "asc" ? cmp : -cmp;
  });
}
