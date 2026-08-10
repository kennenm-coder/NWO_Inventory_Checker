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
}
