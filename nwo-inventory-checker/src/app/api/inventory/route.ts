import { NextResponse } from "next/server";
import Papa from "papaparse";
import type {
  InventoryItem,
  InventoryData,
  StatusCounts,
  ProductTotals,
} from "@/types/inventory";

// In-memory cache to avoid hammering the Orca API
let cachedData: InventoryData | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

function normalizeStatus(raw: string): string {
  const s = raw?.trim() ?? "";
  // Normalize common variations
  const map: Record<string, string> = {
    backordered: "Backordered",
    "not received": "Not Received",
    ordered: "Ordered",
    received: "Received",
    returned: "Returned",
    "sent out": "Sent Out",
    "sent to paint/stain": "Sent To Paint/Stain",
    stock: "Stock",
  };
  return map[s.toLowerCase()] ?? s;
}

function computeStatusCounts(items: InventoryItem[]): StatusCounts {
  const counts: StatusCounts = {
    total: items.length,
    backordered: 0,
    notReceived: 0,
    ordered: 0,
    received: 0,
    returned: 0,
    sentOut: 0,
    sentToPaintStain: 0,
    stock: 0,
  };

  for (const item of items) {
    switch (item.status) {
      case "Backordered":
        counts.backordered++;
        break;
      case "Not Received":
        counts.notReceived++;
        break;
      case "Ordered":
        counts.ordered++;
        break;
      case "Received":
        counts.received++;
        break;
      case "Returned":
        counts.returned++;
        break;
      case "Sent Out":
        counts.sentOut++;
        break;
      case "Sent To Paint/Stain":
        counts.sentToPaintStain++;
        break;
      case "Stock":
        counts.stock++;
        break;
    }
  }

  return counts;
}

// Classify a single item by the Andersen product-code prefix in its description.
// Window codes:  DGB, DGI, DBI, GL, GT, CD, CS, CT, AN, PWU, FW, SWU, BAY
// Patio doors:   NLGD, PD, PS, FWG, FWGCD, FWGD, FWGR, PSGPD, GD, ISPD
// Entry doors:   ED, FWH, FWHID, FV, M (door models), HARDWARE, SET-HDLE, S (handle sets)
function classifyProduct(description: string): "window" | "patioDoor" | "entryDoor" | "misc" {
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

function computeProductTotals(items: InventoryItem[]): ProductTotals {
  let trimOrders = 0;
  let totalWindows = 0;
  let totalPD = 0;
  let totalED = 0;
  let totalMisc = 0;

  for (const item of items) {
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

// Build a flexible, case-insensitive column getter for an Orca CSV row.
// Tries multiple possible header names for each field.
function makeGet(row: Record<string, string>) {
  return (keys: string[]): string => {
    for (const key of keys) {
      // Try exact match first
      if (row[key] !== undefined && row[key] !== "") return row[key].trim();
      // Try case-insensitive
      const found = Object.keys(row).find(
        (k) => k.toLowerCase().trim() === key.toLowerCase()
      );
      if (found && row[found] !== undefined && row[found] !== "") return row[found].trim();
    }
    return "";
  };
}

// Map main-inventory CSV row headers to our field names
function parseRow(row: Record<string, string>): InventoryItem {
  const get = makeGet(row);

  return {
    unitId: get(["Barcode", "Unit ID", "UnitID", "unit_id"]),
    name: get(["Name", "name", "Customer Name"]),
    vendor: get(["Vendor", "vendor"]),
    jobNumber: get(["Job Order Number", "Job Number", "JobNumber", "job_number"]),
    customerPO: get(["Customer PO", "CustomerPO", "customer_po", "PO"]),
    status: normalizeStatus(get(["Status", "status"])),
    location: get(["Location", "location"]),
    soLineItem: get(["SO Line Item", "SOLineItem", "so_line_item"]),
    description: get(["Description", "description"]),
    changedOn: get(["Truck Ship Date", "Changed On", "Received Date"]),
    source: "main",
  };
}

// The trim sheet has a different shape:
//   Barcode, Name, Location, Bundles, Status, Received Quantity,
//   8 Foot, 10 Foot, 12 Foot, 14 Foot, 16 Foot, Pieces Complete
// Two row kinds:
//   1) Bulk stock — Name is a profile like "EJ 5 1/2 (RBA White)", counts by length.
//   2) Customer bundles — Name is "Lastname, First - JobNumber", staged on a trim rack.
function parseTrimRow(row: Record<string, string>): InventoryItem {
  const get = makeGet(row);

  const name = get(["Name", "name"]);
  const location = get(["Location", "location"]);
  const bundles = get(["Bundles", "bundles"]);
  const received = get(["Received Quantity", "Received Qty"]);
  const pieces = get(["Pieces Complete", "Pieces"]);
  const rawStatus = get(["Status", "status"]);

  // Length breakdown (bulk stock rows)
  const lengths: Array<[string, string]> = [
    ["8", get(["8 Foot", "8 foot", "8ft"])],
    ["10", get(["10 Foot", "10 foot", "10ft"])],
    ["12", get(["12 Foot", "12 foot", "12ft"])],
    ["14", get(["14 Foot", "14 foot", "14ft"])],
    ["16", get(["16 Foot", "16 foot", "16ft"])],
  ];
  const hasLengths = lengths.some(([, v]) => v && v !== "0");

  // Job number is embedded in the customer name suffix, e.g. "Graven, Karen - 8617"
  const jobMatch = name.match(/-\s*([A-Za-z0-9]{3,})\s*$/);
  const jobNumber = jobMatch ? jobMatch[1] : "";

  // Synthesize a description so the row isn't blank in the table
  let description: string;
  if (hasLengths) {
    const breakdown = lengths
      .filter(([, v]) => v && v !== "0")
      .map(([ft, v]) => `${ft}ft:${v}`)
      .join(" ");
    description = `Trim Stock${pieces ? ` — ${pieces} pcs` : ""}${breakdown ? ` (${breakdown})` : ""}`;
  } else {
    const parts = [
      bundles ? `${bundles} bundle${bundles === "1" ? "" : "s"}` : "",
      received ? `${received} pcs` : "",
    ].filter(Boolean);
    description = `Trim${parts.length ? ` — ${parts.join(", ")}` : ""}`;
  }

  return {
    unitId: get(["Barcode", "Unit ID"]),
    name,
    vendor: "",
    jobNumber,
    customerPO: "",
    // Trim rows rarely carry a status; treat on-hand trim as Stock so it badges/filters cleanly
    status: normalizeStatus(rawStatus) || "Stock",
    location,
    soLineItem: "",
    description,
    changedOn: "",
    source: "trim",
  };
}

// Fetch one Orca sheet as CSV and map each row with the given parser.
async function fetchSheet(
  apiUrl: string,
  parser: (row: Record<string, string>) => InventoryItem
): Promise<InventoryItem[]> {
  const response = await fetch(apiUrl, {
    headers: { Accept: "text/csv" },
    next: { revalidate: 0 }, // Don't use Next.js cache — we have our own
  });

  if (!response.ok) {
    throw new Error(`Orca API returned ${response.status}: ${response.statusText}`);
  }

  const csvText = await response.text();

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  if (parsed.errors.length > 0) {
    console.warn("CSV parse warnings:", parsed.errors.slice(0, 5));
  }

  return parsed.data
    .map(parser)
    .filter((item) => item.name || item.jobNumber || item.status); // Filter out empty rows
}

async function fetchFromOrca(): Promise<InventoryData> {
  const apiUrl = process.env.ORCA_API_URL;
  if (!apiUrl) {
    throw new Error("ORCA_API_URL environment variable is not set");
  }
  const trimUrl = process.env.ORCA_TRIM_API_URL;

  // Fetch main inventory (required) and trim inventory (optional) in parallel.
  const [mainItems, trimItems] = await Promise.all([
    fetchSheet(apiUrl, parseRow),
    trimUrl
      ? fetchSheet(trimUrl, parseTrimRow).catch((err) => {
          // Don't let a trim-sheet hiccup take down the whole app
          console.error("Failed to fetch trim inventory:", err);
          return [] as InventoryItem[];
        })
      : Promise.resolve([] as InventoryItem[]),
  ]);

  const items = [...mainItems, ...trimItems];

  // Dashboard metrics stay scoped to the main inventory (matches the source sheet),
  // with the trim count surfaced separately in the product totals.
  const statusCounts = computeStatusCounts(mainItems);
  const productTotals = computeProductTotals(mainItems);
  productTotals.trimOrders = trimItems.length;

  return {
    items,
    statusCounts,
    productTotals,
    lastUpdated: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get("refresh") === "true";

    // Check cache
    const now = Date.now();
    if (!forceRefresh && cachedData && now - cacheTimestamp < CACHE_DURATION_MS) {
      return NextResponse.json(cachedData);
    }

    // Fetch fresh data
    const data = await fetchFromOrca();

    // Update cache
    cachedData = data;
    cacheTimestamp = now;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch inventory data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
