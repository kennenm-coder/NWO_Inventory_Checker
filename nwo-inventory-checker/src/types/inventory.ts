export type InventorySource = "main" | "trim";

export interface InventoryItem {
  unitId: string;
  name: string;
  vendor: string;
  jobNumber: string;
  customerPO: string;
  status: InventoryStatus;
  location: string;
  soLineItem: string;
  description: string;
  changedOn: string;
  /** Which Orca sheet this row came from */
  source: InventorySource;
  /**
   * Where a trim row was read from: the warehouse's Orca trim sheet ("orca"), or a
   * vendor's own order spreadsheet ("vendor" -- trim ordered / received from North
   * Coast, Wolf Creek, Laborie). Absent on main-inventory rows.
   */
  feed?: "orca" | "vendor";
}

/** What the vendor-order-sheet read did on the last refresh, so a gap is visible, not silent. */
export interface TrimFeedStatus {
  /** VENDOR_TRIM_URL and VENDOR_TRIM_KEY are both set */
  configured: boolean;
  ok: boolean;
  /** When the vendor script read its sheets */
  fetchedAt?: string;
  tabs: { vendor: string; tab: string; kind: "Ordered" | "Received"; rows: number }[];
  problems: string[];
}

export type InventoryStatus =
  | "Backordered"
  | "Not Received"
  | "Ordered"
  | "Received"
  | "Returned"
  | "Sent Out"
  | "Sent To Paint/Stain"
  | "Stock"
  | string;

export interface StatusCounts {
  total: number;
  backordered: number;
  notReceived: number;
  ordered: number;
  received: number;
  returned: number;
  sentOut: number;
  sentToPaintStain: number;
  stock: number;
}

export interface ProductTotals {
  /** Count of trim rows from the trim sheet */
  trimOrders: number;
  totalWindows: number;
  totalPD: number;
  totalED: number;
  totalMisc: number;
  totalItems: number;
}

export interface InventoryData {
  items: InventoryItem[];
  statusCounts: StatusCounts;
  productTotals: ProductTotals;
  lastUpdated: string;
  trimFeed?: TrimFeedStatus;
}
