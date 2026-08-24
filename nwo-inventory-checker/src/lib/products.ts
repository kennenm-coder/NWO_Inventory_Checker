import type { InventoryItem, ProductTotals } from "@/types/inventory";

// Classify a single item by the Andersen product-code prefix in its description.
// Window codes:  DGB, DGI, DBI, GL, GT, CD, CS, CT, AN, PWU, FW, SWU, BAY
// Patio doors:   NLGD, PD, PS, FWG, FWGCD, FWGD, FWGR, PSGPD, GD, ISPD
// Entry doors:   ED, FWH, FWHID, FV, M (door models), HARDWARE, SET-HDLE, S (handle sets)
export function classifyProduct(
  description: string
): "window" | "patioDoor" | "entryDoor" | "misc" {
  const desc = (description ?? "").trim();
  if (!desc) return "misc";

  // First token (the product code prefix)
  const firstToken = desc.split(/\s+/)[0].toUpperCase();

  // Windows — match prefix but exclude FWG*/FWH* (those are doors)
  const windowPrefixes = [
    "DGB", "DGI", "DBI", "GL", "GT", "CD", "CS", "CT", "AN",
    "PWU", "FW", "SWU", "BAY",
  ];
  for (const p of windowPrefixes) {
    if (firstToken === p || firstToken.startsWith(p)) {
      // FWG* = patio door, FWH* = entry door — don't classify as window
      if (firstToken.startsWith("FWG") || firstToken.startsWith("FWH")) break;
      return "window";
    }
  }

  // Some items have dimensions first, then the window code (e.g. "32.867\"W DGB ...")
  // Check the second token if the first looks like a dimension
  if (/^\d/.test(firstToken)) {
    const tokens = desc.toUpperCase().split(/\s+/);
    for (const t of tokens.slice(1, 4)) {
      if (windowPrefixes.some((p) => t === p || (t.startsWith(p) && !t.startsWith("FWG") && !t.startsWith("FWH")))) {
        return "window";
      }
    }
  }

  // Patio doors (gliding doors)
  const patioPrefixes = ["NLGD", "PD", "PSGPD", "PS", "FWG", "GD", "ISPD"];
  for (const p of patioPrefixes) {
    if (firstToken === p || firstToken.startsWith(p)) return "patioDoor";
  }

  // Entry doors
  const entryPrefixes = ["ED", "FWHID", "FWH", "FV", "HARDWARE"];
  for (const p of entryPrefixes) {
    if (firstToken === p || firstToken.startsWith(p)) return "entryDoor";
  }
  // Single-letter prefixes need more context
  if (firstToken === "M" && /^M\s+\d/.test(desc)) return "entryDoor";
  if (firstToken === "S" && desc.toUpperCase().includes("SET-HDLE")) return "entryDoor";
  if (firstToken === "SET-HDLE") return "entryDoor";
  // Dimension-prefixed entry doors (e.g. "30\"W 10RS ... FULLVIEW")
  if (/^\d/.test(firstToken) && /FULLVIEW|DOOR|10RS|10FV/i.test(desc)) return "entryDoor";

  return "misc";
}

// Compute product totals for a list of items. Trim-sourced rows are counted as
// trimOrders; everything else is classified by its description.
export function computeProductTotals(items: InventoryItem[]): ProductTotals {
  let trimOrders = 0;
  let totalWindows = 0;
  let totalPD = 0;
  let totalED = 0;
  let totalMisc = 0;

  for (const item of items) {
    if (item.source === "trim") {
      trimOrders++;
      continue;
    }
    const category = classifyProduct(item.description);
    switch (category) {
      case "window":
        totalWindows++;
        break;
      case "patioDoor":
        totalPD++;
        break;
      case "entryDoor":
        totalED++;
        break;
      default:
        totalMisc++;
        break;
    }
  }

  return {
    trimOrders,
    totalWindows,
    totalPD,
    totalED,
    totalMisc,
    totalItems: items.length,
  };
}
