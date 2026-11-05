import Papa from "papaparse";
import type { InventoryItem, TrimFeedStatus } from "@/types/inventory";

// The vendors' own order spreadsheets (North Coast, Wolf Creek, Laborie). Two ways in:
//
//   1. A published CSV tab of the Live Status spreadsheet (VENDOR_TRIM_CSV_URL) -- the
//      doc that already links the three vendor sheets in and works out Ordered / Received
//      for every row. No script needed; this is the one to use. See parseLiveSheetRows.
//   2. The Apps Script `rows` action (VENDOR_TRIM_URL + VENDOR_TRIM_KEY), for anyone who
//      has that script. Everything above parseLiveSheetRows is that path.
//
// The script path reads straight from the Apps Script that already writes to the sheets. That script answers
// the `rows` action with the raw cells of each vendor's Ordered tab and its
// Received tab(s) -- at request time, so these rows are exactly as live as the
// Orca feed beside them (and not subject to IMPORTRANGE's own refresh schedule).
//
// The three sheets do NOT share one layout: the header sits on row 1, 2 or 3
// depending on the tab, and the received date lives in a different unlabelled
// column per vendor. So we find the header by its text and map columns from it,
// and we deliberately do not guess a received date.

export interface VendorSheetPayload {
  index: number;
  name: string;
  rows: string[][];
}
export interface VendorPayload {
  sheets?: VendorSheetPayload[];
  error?: string;
}
export interface VendorTrimPayload {
  ok?: boolean;
  error?: string;
  fetchedAt?: string;
  vendors?: Record<string, VendorPayload>;
}

const VENDOR_LABEL: Record<string, string> = {
  "NORTH COAST": "North Coast",
  "WOLF CREEK": "Wolf Creek",
  LABORIE: "Laborie",
};

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/** "22\tPCS\tParting Stop\t\r\n20\tPCS\t1 3/4\" Lattice" -> "22 PCS Parting Stop; 20 PCS 1 3/4\" Lattice" */
export function cleanDescription(raw: string): string {
  return (raw ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/[\t ]+/g, " ").trim())
    .filter(Boolean)
    .join("; ");
}

function clean(raw: string): string {
  return (raw ?? "").replace(/\s+/g, " ").trim();
}

/** The order/job number is the last run of 5+ digits in "Customer + RbA Order #". */
export function jobNumberFrom(customerRef: string): string {
  const runs = customerRef.match(/\d{5,}/g);
  return runs ? runs[runs.length - 1] : "";
}

interface Columns {
  date: number;
  orderedBy: number;
  customer: number;
  description: number;
  firstDataRow: number;
}

/**
 * Find the header row (the first of the top few rows holding a "Customer..." cell)
 * and read the column positions from it. A sheet with no recognisable header falls
 * back to the layout the app itself writes: columns A-D, data from row 3.
 */
export function findColumns(rows: string[][]): Columns {
  for (let r = 0; r < Math.min(rows.length, 8); r++) {
    const row = rows[r] ?? [];
    const customer = row.findIndex((c) => /^\s*customer\b/i.test(c ?? ""));
    if (customer === -1) continue;
    const orderedBy = row.findIndex((c) => /ordered\s*by/i.test(c ?? ""));
    const description = row.findIndex((c) => /^\s*(description|items)/i.test(c ?? ""));
    return {
      customer,
      orderedBy,
      // The date column has no (or a garbled) header; it sits just before "Ordered By".
      date: orderedBy > 0 ? orderedBy - 1 : Math.max(0, customer - 2),
      description: description !== -1 ? description : customer + 1,
      firstDataRow: r + 1,
    };
  }
  return { date: 0, orderedBy: 1, customer: 2, description: 3, firstDataRow: 2 };
}

type TabKind = "Ordered" | "Received" | null;

function tabKind(sheet: VendorSheetPayload): TabKind {
  if (/received/i.test(sheet.name)) return "Received";
  if (sheet.index === 0) return "Ordered";
  return null;
}

export function parseVendorSheet(
  vendorLabel: string,
  sheet: VendorSheetPayload,
  kind: Exclude<TabKind, null>
): InventoryItem[] {
  const cols = findColumns(sheet.rows);
  const items: InventoryItem[] = [];
  const abbr = vendorLabel.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();

  for (let r = cols.firstDataRow; r < sheet.rows.length; r++) {
    const row = sheet.rows[r] ?? [];
    const customerRef = clean(row[cols.customer] ?? "");
    if (!customerRef) continue; // blank row, or a "RECEIVED 1/2/26" banner between batches
    if (/^customer\b/i.test(customerRef)) continue; // a repeated header

    let description = cleanDescription(row[cols.description] ?? "");

    // A hand-written note elsewhere on the row (e.g. "Job Cancelled" under Estimated).
    const other = row.filter(
      (_, i) =>
        i !== cols.date &&
        i !== cols.orderedBy &&
        i !== cols.customer &&
        i !== cols.description
    );
    if (other.some((c) => /cancel/i.test(c ?? ""))) {
      description = `${description || "Trim order"} (Job cancelled)`;
    }

    items.push({
      unitId: `VND-${abbr}-${kind === "Ordered" ? "O" : "R"}-${r + 1}`,
      name: customerRef,
      vendor: vendorLabel,
      jobNumber: jobNumberFrom(customerRef),
      customerPO: "",
      status: kind,
      location: "",
      soLineItem: "",
      description: description || "Trim order",
      // Date ordered: a plain date string, which the table's date sort can read.
      changedOn: clean(row[cols.date] ?? ""),
      source: "trim",
      feed: "vendor",
    });
  }
  return items;
}

export function parseVendorTrim(payload: VendorTrimPayload): {
  items: InventoryItem[];
  tabs: TrimFeedStatus["tabs"];
  problems: string[];
} {
  const items: InventoryItem[] = [];
  const tabs: TrimFeedStatus["tabs"] = [];
  const problems: string[] = [];

  for (const [key, vendor] of Object.entries(payload.vendors ?? {})) {
    const label = VENDOR_LABEL[key.toUpperCase()] ?? titleCase(key);
    if (vendor.error || !vendor.sheets) {
      problems.push(`${label}: ${vendor.error ?? "no sheets returned"}`);
      continue;
    }
    let sawOrdered = false;
    let sawReceived = false;
    for (const sheet of vendor.sheets) {
      const kind = tabKind(sheet);
      if (!kind) continue;
      const parsed = parseVendorSheet(label, sheet, kind);
      items.push(...parsed);
      tabs.push({ vendor: label, tab: sheet.name, kind, rows: parsed.length });
      if (kind === "Ordered") sawOrdered = true;
      else sawReceived = true;
    }
    // A missing tab would otherwise just look like "nothing ordered / received yet".
    if (!sawOrdered) problems.push(`${label}: no Ordered tab found`);
    if (!sawReceived) problems.push(`${label}: no Received tab found`);
  }
  return { items, tabs, problems };
}

// ---- Path 1: the Live Status spreadsheet, published as CSV -------------------------------
//
// How that spreadsheet makes these rows (read from its formulas, 2026-11-05):
//   - each vendor's Ordered tab and Received tab are linked in with IMPORTRANGE;
//   - a row is "Ordered" simply by being on the Ordered tab (=IF(COUNTA(A4:J4)>0,"Ordered","")),
//     and "Received" when it comes from the Received tab;
//   - the three vendors are stacked into one list and laid out in Orca's column order.
// So the status here is the spreadsheet's own, not something this app works out.
//
// Two shapes of published tab are understood, found by their header NAMES, not positions:
//   - a purpose-made small tab with the headers Name, Vendor, Status, Job Order Number,
//     Description, Date Ordered (the recommended one); or
//   - the "RAW Paint and Stain Inventory Helper" tab itself, whose right-hand block has
//     Name, Vendor, Status, Description, Job Order Number and a column with NO header
//     (just before "Component Ordered") that holds the date ordered.
// Rows whose Status is not Ordered/Received (the stacked sections' own header rows) are skipped.

const cellAt = (row: string[], i: number): string => (i >= 0 && i < row.length ? clean(row[i] ?? "") : "");
const lc = (v: string) => (v ?? "").trim().toLowerCase();

export function parseLiveSheetRows(rows: string[][]): {
  items: InventoryItem[];
  tabs: TrimFeedStatus["tabs"];
  problems: string[];
} {
  const items: InventoryItem[] = [];
  const tabs: TrimFeedStatus["tabs"] = [];
  const problems: string[] = [];

  // The header row: the first of the top rows that names all four columns we need.
  let hr = -1;
  for (let r = 0; r < Math.min(rows.length, 8); r++) {
    const names = (rows[r] ?? []).map(lc);
    if (["name", "vendor", "status", "description"].every((n) => names.includes(n))) { hr = r; break; }
  }
  if (hr === -1) {
    problems.push("couldn't find the Name / Vendor / Status / Description headers in the published tab");
    return { items, tabs, problems };
  }
  const head = (rows[hr] ?? []).map(lc);
  const iName = head.indexOf("name");
  // Same-named headers can also appear in blocks to the left; the block we want starts at "Name".
  const iVendor = head.indexOf("vendor", iName);
  const iStatus = head.indexOf("status", iName);
  const iDesc = head.indexOf("description", iName);
  const iJob = head.indexOf("job order number", iName);
  let iDate = head.indexOf("date ordered", iName);
  if (iDate === -1) {
    // The raw helper tab: the date sits in the column with no header just before "Component Ordered".
    const co = head.indexOf("component ordered");
    if (co > 0 && head[co - 1] === "") iDate = co - 1;
  }

  const seen = new Map<string, { vendor: string; kind: "Ordered" | "Received"; rows: number }>();
  for (let r = hr + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const status = lc(cellAt(row, iStatus));
    if (status !== "ordered" && status !== "received") continue; // blank rows and the stacked sections' header rows
    const kind: "Ordered" | "Received" = status === "ordered" ? "Ordered" : "Received";
    const name = cellAt(row, iName);
    if (!name || /^customer\b/i.test(name)) continue;
    const rawVendor = cellAt(row, iVendor);
    if (!rawVendor) continue;
    const vendor = VENDOR_LABEL[rawVendor.toUpperCase()] ?? titleCase(rawVendor);
    const abbr = vendor.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();

    items.push({
      unitId: `VND-${abbr}-${kind === "Ordered" ? "O" : "R"}-${r + 1}`,
      name,
      vendor,
      jobNumber: cellAt(row, iJob) || jobNumberFrom(name),
      customerPO: "",
      status: kind,
      location: "",
      soLineItem: "",
      description: cleanDescription(row[iDesc] ?? "") || "Trim order",
      changedOn: cellAt(row, iDate),
      source: "trim",
      feed: "vendor",
    });
    const k = `${vendor}|${kind}`;
    const t = seen.get(k) ?? { vendor, kind, rows: 0 };
    t.rows++;
    seen.set(k, t);
  }

  for (const t of seen.values()) tabs.push({ vendor: t.vendor, tab: "Live Status sheet", kind: t.kind, rows: t.rows });
  // An empty vendor would otherwise read as "nothing ordered / received yet".
  for (const v of Object.values(VENDOR_LABEL)) {
    if (!seen.has(`${v}|Ordered`) && !seen.has(`${v}|Received`)) problems.push(`${v}: no rows in the published tab`);
  }
  return { items, tabs, problems };
}

/** Path 2: the Apps Script `rows` action. Never throws. */
async function fetchViaScript(
  url: string | undefined,
  key: string | undefined
): Promise<{ items: InventoryItem[]; feed: TrimFeedStatus }> {
  if (!url || !key) {
    return { items: [], feed: { configured: false, ok: false, tabs: [], problems: [] } };
  }
  try {
    // POST, so the key travels in the body and never lands in a URL or a log. Apps
    // Script answers with a redirect to the result, which fetch follows.
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "rows", key }),
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    const text = await res.text();
    let payload: VendorTrimPayload;
    try {
      payload = JSON.parse(text);
    } catch {
      // Google's HTML error page: the script isn't deployed as a web app for us, or it threw.
      throw new Error(`vendor script answered HTTP ${res.status} with something that is not JSON`);
    }
    // The pre-`rows` deployment reads the request as an order, finds no vendor and answers
    // "Unknown vendor: undefined" without writing anything.
    if (!payload.ok && /^Unknown vendor/i.test(String(payload.error || ""))) {
      throw new Error("vendor script is out of date -- redeploy it (see vendor-order-sheet-apps-script.md)");
    }
    if (!payload.ok) throw new Error(payload.error || "vendor script refused the request");

    const { items, tabs, problems } = parseVendorTrim(payload);
    return {
      items,
      feed: {
        configured: true,
        ok: problems.length === 0,
        fetchedAt: payload.fetchedAt,
        tabs,
        problems,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("Vendor trim feed failed:", message);
    return {
      items: [],
      feed: { configured: true, ok: false, tabs: [], problems: [message] },
    };
  }
}

/**
 * The vendor trim orders: from the Live Status spreadsheet's published CSV tab when
 * VENDOR_TRIM_CSV_URL is set (preferred -- no script), otherwise from the Apps Script
 * when VENDOR_TRIM_URL + VENDOR_TRIM_KEY are. Neither set = not configured, and the
 * checker simply shows no vendor rows. Never throws: a hiccup here must not take the
 * Orca inventory down with it.
 */
export async function fetchVendorTrim(opts: {
  csvUrl?: string;
  scriptUrl?: string;
  scriptKey?: string;
}): Promise<{ items: InventoryItem[]; feed: TrimFeedStatus }> {
  const { csvUrl, scriptUrl, scriptKey } = opts;
  if (csvUrl) {
    try {
      const res = await fetch(csvUrl, { cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(25_000) });
      const text = await res.text();
      if (!res.ok) throw new Error(`the published tab answered HTTP ${res.status}`);
      // A sign-in or error page is HTML; a CSV never starts with a tag.
      if (/^\s*</.test(text)) throw new Error("the link didn't return CSV -- is the tab published to the web as CSV?");
      const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false });
      const { items, tabs, problems } = parseLiveSheetRows(parsed.data);
      return { items, feed: { configured: true, ok: problems.length === 0, tabs, problems } };
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      console.error("Vendor trim feed failed:", message);
      return { items: [], feed: { configured: true, ok: false, tabs: [], problems: [message] } };
    }
  }
  return fetchViaScript(scriptUrl, scriptKey);
}
