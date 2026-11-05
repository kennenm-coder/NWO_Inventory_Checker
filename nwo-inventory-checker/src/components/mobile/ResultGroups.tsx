"use client";

import { useState } from "react";
import type { InventoryItem } from "@/types/inventory";
import { StatusDot, getStatusConfig } from "@/components/StatusBadge";
import { TrimTag } from "@/components/TrimTag";

// The phone result list. People come here to answer "is this customer's order in,
// and where is it?", so the unit of display is the CUSTOMER + JOB, not the single
// line: Watts, Linda with five windows is one card with five lines instead of five
// near-identical cards. Rows are grouped only when they sit next to each other in
// the current sort, so a sort by status or location never pulls a customer's lines
// out of the order the user asked for.

interface Group {
  key: string;
  name: string;
  jobNumber: string;
  items: InventoryItem[];
}

export function groupAdjacent(items: InventoryItem[]): Group[] {
  const groups: Group[] = [];
  for (const item of items) {
    const name = item.name || "";
    const k = `${name.toLowerCase()}|${item.jobNumber}`;
    const last = groups[groups.length - 1];
    // Rows with no name are never merged: there is nothing to say they belong together.
    if (last && name && last.key === k) {
      last.items.push(item);
    } else {
      groups.push({ key: k, name, jobNumber: item.jobNumber, items: [item] });
    }
  }
  return groups;
}

function PinIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// `lead` is for a customer with a single item: the name goes on the line with the status
// and the job number joins the pills, so the whole thing is one compact card instead of
// a header, a job line and an item line. In a multi-item card the header carries both.
function LocationPill({ location }: { location: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-[#6CC14C]/15 px-1.5 py-0.5 text-[12px] font-semibold text-[#326222] dark:text-[#8fd673]">
      <PinIcon />
      {location}
    </span>
  );
}

function ItemLine({
  item, showPO, showLocation = true, lead, jobNumber,
}: { item: InventoryItem; showPO: boolean; showLocation?: boolean; lead?: string; jobNumber?: string }) {
  const [open, setOpen] = useState(false);
  const cfg = getStatusConfig(item.status);
  const title = item.description || item.name || "Unnamed item";
  const hasMeta = !!((showLocation && item.location) || item.source === "trim" || (lead && jobNumber) || (showPO && item.customerPO));

  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      aria-expanded={open}
      className="w-full text-left flex min-h-[48px] touch-manipulation active:bg-gray-50 dark:active:bg-gray-700/40"
    >
      {/* status colour bar */}
      <span className={`w-1 shrink-0 ${cfg.mobileBg}`} aria-hidden="true" />

      <span className="flex-1 min-w-0 px-3 py-2">
        <span className="flex items-start justify-between gap-3">
          {lead ? (
            <span className="min-w-0 truncate text-[15px] font-bold text-gray-900 dark:text-white">{lead}</span>
          ) : (
            <span
              className={`text-[14px] leading-snug font-medium text-gray-900 dark:text-gray-100 ${open ? "" : "line-clamp-2"}`}
            >
              {title}
            </span>
          )}
          <span className="shrink-0 pt-0.5">
            <StatusDot status={item.status} />
          </span>
        </span>

        {lead && (
          <span
            className={`mt-0.5 block text-[14px] leading-snug text-gray-800 dark:text-gray-200 ${open ? "" : "line-clamp-2"}`}
          >
            {title}
          </span>
        )}

        {hasMeta && (
          <span className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {showLocation && item.location && <LocationPill location={item.location} />}
            {item.source === "trim" && <TrimTag item={item} />}
            {lead && jobNumber && (
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Job <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{jobNumber}</span>
              </span>
            )}
            {showPO && item.customerPO && (
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                PO <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{item.customerPO}</span>
              </span>
            )}
          </span>
        )}

        {open && (
          <span className="mt-2 block space-y-1 border-t border-gray-100 pt-2 text-[12px] dark:border-gray-700 animate-in">
            {item.vendor && (
              <span className="block">
                <span className="text-gray-400 dark:text-gray-500">Vendor </span>
                <span className="text-gray-700 dark:text-gray-300">{item.vendor}</span>
              </span>
            )}
            {item.changedOn && (
              <span className="block">
                <span className="text-gray-400 dark:text-gray-500">{item.feed === "vendor" ? "Ordered " : "Updated "}</span>
                <span className="text-gray-700 dark:text-gray-300">{item.changedOn}</span>
              </span>
            )}
            {item.soLineItem && (
              <span className="block">
                <span className="text-gray-400 dark:text-gray-500">SO line </span>
                <span className="font-mono text-gray-700 dark:text-gray-300">{item.soLineItem}</span>
              </span>
            )}
            {item.unitId && (
              <span className="block font-mono text-[10px] text-gray-400 dark:text-gray-500 break-all">ID {item.unitId}</span>
            )}
          </span>
        )}
      </span>
    </button>
  );
}

function GroupCard({ group }: { group: Group }) {
  const { items } = group;
  // The PO goes on the card when every line shares it; otherwise each line carries its own.
  const sharedPO = items.every((i) => i.customerPO === items[0].customerPO) ? items[0].customerPO : "";
  // Same for the rack: ten windows on one pallet say "Pallet 11" once, in the header.
  const sharedLoc = items.every((i) => i.location === items[0].location) ? items[0].location : "";
  const showName = group.name || "No name";

  if (items.length === 1) {
    return (
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <ItemLine item={items[0]} showPO lead={showName} jobNumber={group.jobNumber} />
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <header className="flex items-baseline justify-between gap-2 px-3 pt-2.5 pb-1">
        <h3 className="min-w-0 truncate text-[15px] font-bold text-gray-900 dark:text-white">{showName}</h3>
        {items.length > 1 && (
          <span className="shrink-0 text-[11px] font-medium tabular-nums text-gray-400 dark:text-gray-500">
            {items.length} items
          </span>
        )}
      </header>

      {(group.jobNumber || sharedPO || sharedLoc) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 pb-2 text-[11px] text-gray-500 dark:text-gray-400">
          {sharedLoc && <LocationPill location={sharedLoc} />}
          {group.jobNumber && (
            <span>
              Job <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{group.jobNumber}</span>
            </span>
          )}
          {sharedPO && (
            <span>
              PO <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{sharedPO}</span>
            </span>
          )}
        </div>
      )}

      <ul className="divide-y divide-gray-100 border-t border-gray-100 dark:divide-gray-700 dark:border-gray-700">
        {items.map((item, i) => {
          // Where the rack changes, say so once with how many lines sit there, instead of
          // repeating the same pill on every line. (A rack shared by the whole card is
          // already in the header, so there are no dividers then.)
          const startsRun = !sharedLoc && !!item.location && item.location !== items[i - 1]?.location;
          let runLength = 0;
          if (startsRun) {
            while (items[i + runLength] && items[i + runLength].location === item.location) runLength++;
          }
          return (
            <li key={`${item.unitId}-${i}`}>
              {startsRun && (
                <div className="flex items-center justify-between gap-2 bg-gray-50 px-3 py-1.5 dark:bg-gray-900/40">
                  <LocationPill location={item.location} />
                  <span className="text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
                    {runLength} {runLength === 1 ? "item" : "items"}
                  </span>
                </div>
              )}
              <ItemLine item={item} showPO={!sharedPO} showLocation={false} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ResultGroups({ items }: { items: InventoryItem[] }) {
  const groups = groupAdjacent(items);
  return (
    <div className="space-y-2">
      {groups.map((g, i) => (
        <GroupCard key={`${g.key}-${i}`} group={g} />
      ))}
    </div>
  );
}
