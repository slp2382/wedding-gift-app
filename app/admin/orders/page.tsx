"use client";

import { useEffect, useMemo, useState } from "react";

type AdminOrderRow = {
  orderId: string | null;
  jobIds: string[];
  quantity: number;

  createdAt: string | null;

  cardIds: string[];
  primaryCardId: string | null;
  printFileUrls: string[];

  fulfillmentStatus: string;
  printfulStatus: string | null;
  printfulOrderId: number | string | null;
  printfulOrderIds: Array<number | string>;

  jobStatus: string | null;
  errorMessage: string | null;

  paymentStatus: string | null;

  shippingName: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingPostalCode: string | null;

  email: string | null;
  amountTotal: number | null;

  trackingNumber?: string | null;
  trackingUrl?: string | null;
  shipmentStatus?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  trackingEmailSentAt?: string | null;
  carrier?: string | null;
  service?: string | null;
};

type FetchState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "loaded"; data: AdminOrderRow[] }
  | { state: "error"; message: string };

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "error", label: "Error" },
] as const;

type FilterKey = (typeof FILTER_TABS)[number]["key"];

type SortKey =
  | "createdAt"
  | "quantity"
  | "cardId"
  | "customer"
  | "paymentStatus"
  | "fulfillmentStatus"
  | "printfulStatus"
  | "printfulOrderId";

type SortDir = "asc" | "desc";

function cmp(a: any, b: any) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;

  if (typeof a === "number" && typeof b === "number") return a - b;

  const as = String(a).toLowerCase();
  const bs = String(b).toLowerCase();
  if (as < bs) return -1;
  if (as > bs) return 1;
  return 0;
}

function parseDateMs(v: string | null | undefined): number {
  if (!v) return 0;
  const d = new Date(v);
  const t = d.getTime();
  return Number.isFinite(t) ? t : 0;
}

function isDeliveredRow(row: AdminOrderRow): boolean {
  const fs = String(row.fulfillmentStatus ?? "").toLowerCase();
  const ss = String(row.shipmentStatus ?? "").toLowerCase();
  if (fs === "delivered") return true;
  if (ss.includes("deliver")) return true;
  if (row.deliveredAt) return true;
  return false;
}

function shortId(v: string | null | undefined): string {
  if (!v) return "n/a";
  return v.length > 8 ? v.slice(0, 8) : v;
}

export default function AdminOrdersPage() {
  const [fetchState, setFetchState] = useState<FetchState>({ state: "idle" });
  const [filter, setFilter] = useState<FilterKey>("pending");
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>("all");

  async function loadOrders() {
    try {
      setFetchState({ state: "loading" });
      const res = await fetch("/api/admin/orders");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to load orders");
      }
      const data = (await res.json()) as { orders: AdminOrderRow[] };
      setFetchState({ state: "loaded", data: data.orders ?? [] });
    } catch (err) {
      console.error(err);
      setFetchState({
        state: "error",
        message: err instanceof Error ? err.message : "Failed to fetch orders",
      });
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  function toggleSort(nextKey: SortKey) {
    setSortKey((prevKey) => {
      if (prevKey !== nextKey) {
        setSortDir("asc");
        return nextKey;
      }
      setSortDir((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
      return prevKey;
    });
  }

  async function updateFulfillmentForOrder(row: AdminOrderRow, status: string) {
    const key = row.orderId ?? row.jobIds[0] ?? "";
    if (!key) return;

    try {
      setUpdatingKey(key);

      for (const jobId of row.jobIds) {
        const res = await fetch("/api/admin/orders/updateFulfillment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId, fulfillmentStatus: status }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Failed to update fulfillment status");
        }
      }

      await loadOrders();
    } catch (err) {
      console.error(err);
      alert(
        err instanceof Error ? err.message : "Failed to update fulfillment status",
      );
    } finally {
      setUpdatingKey(null);
    }
  }

  const visibleOrders = useMemo(() => {
    if (fetchState.state !== "loaded") return [];
    const base = fetchState.data;

    const tabFiltered =
      filter === "all"
        ? base
        : filter === "error"
          ? base.filter(
              (row) =>
                row.fulfillmentStatus === "error" ||
                row.jobStatus === "error" ||
                Boolean(row.errorMessage),
            )
          : filter === "delivered"
            ? base.filter((row) => isDeliveredRow(row))
            : base.filter((row) => String(row.fulfillmentStatus) === filter);

    const fulfillmentFiltered =
      fulfillmentFilter === "all"
        ? tabFiltered
        : fulfillmentFilter === "delivered"
          ? tabFiltered.filter((row) => isDeliveredRow(row))
          : tabFiltered.filter(
              (row) =>
                String(row.fulfillmentStatus ?? "").toLowerCase() ===
                String(fulfillmentFilter).toLowerCase(),
            );

    const sorted = [...fulfillmentFiltered].sort((a, b) => {
      let av: any = null;
      let bv: any = null;

      if (sortKey === "createdAt") {
        av = parseDateMs(a.createdAt);
        bv = parseDateMs(b.createdAt);
      } else if (sortKey === "quantity") {
        av = a.quantity ?? 0;
        bv = b.quantity ?? 0;
      } else if (sortKey === "cardId") {
        av = a.primaryCardId ?? "";
        bv = b.primaryCardId ?? "";
      } else if (sortKey === "customer") {
        av = a.shippingName ?? a.email ?? "";
        bv = b.shippingName ?? b.email ?? "";
      } else if (sortKey === "paymentStatus") {
        av = a.paymentStatus ?? "";
        bv = b.paymentStatus ?? "";
      } else if (sortKey === "fulfillmentStatus") {
        const aDisplay = isDeliveredRow(a) ? "delivered" : a.fulfillmentStatus;
        const bDisplay = isDeliveredRow(b) ? "delivered" : b.fulfillmentStatus;
        av = aDisplay ?? "";
        bv = bDisplay ?? "";
      } else if (sortKey === "printfulStatus") {
        av = a.printfulStatus ?? "";
        bv = b.printfulStatus ?? "";
      } else if (sortKey === "printfulOrderId") {
        av = a.printfulOrderId ?? "";
        bv = b.printfulOrderId ?? "";
      }

      const c = cmp(av, bv);
      return sortDir === "asc" ? c : -c;
    });

    return sorted;
  }, [fetchState, filter, fulfillmentFilter, sortKey, sortDir]);

  function SortHeader(props: { label: string; k: SortKey }) {
    const active = sortKey === props.k;
    const arrow = active ? (sortDir === "asc" ? "▲" : "▼") : "↕";

    return (
      <button
        type="button"
        onClick={() => toggleSort(props.k)}
        className="inline-flex items-center gap-1"
      >
        <span>{props.label}</span>
        <span className="text-xs text-zinc-500">{arrow}</span>
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="mx-auto w-full max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">GiftLink admin</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Card pack orders
            </p>
          </div>

          <button
            type="button"
            onClick={loadOrders}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Refresh
          </button>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-2 text-sm">
                {FILTER_TABS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      filter === f.key
                        ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
                        : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="ml-2 flex items-center gap-2">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Fulfillment
                </span>
                <select
                  value={fulfillmentFilter}
                  onChange={(e) => setFulfillmentFilter(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  <option value="all">All</option>
                  <option value="pending">pending</option>
                  <option value="processing">processing</option>
                  <option value="shipped">shipped</option>
                  <option value="delivered">delivered</option>
                  <option value="error">error</option>
                </select>
              </div>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Showing {visibleOrders.length} of{" "}
              {fetchState.state === "loaded" ? fetchState.data.length : 0} orders
            </p>
          </div>

          {fetchState.state === "loading" && (
            <div className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Loading orders…
            </div>
          )}

          {fetchState.state === "error" && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
              {fetchState.message}
            </div>
          )}

          {fetchState.state === "loaded" && visibleOrders.length === 0 && (
            <div className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No orders found for this filter.
            </div>
          )}

          {fetchState.state === "loaded" && visibleOrders.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    <th className="px-3 py-2 font-medium">
                      <SortHeader label="Created" k="createdAt" />
                    </th>
                    <th className="px-3 py-2 font-medium">
                      <SortHeader label="Card" k="cardId" />
                    </th>
                    <th className="px-3 py-2 font-medium">
                      <SortHeader label="Qty" k="quantity" />
                    </th>
                    <th className="px-3 py-2 font-medium">
                      <SortHeader label="Customer" k="customer" />
                    </th>
                    <th className="px-3 py-2 font-medium">
                      <SortHeader label="Payment" k="paymentStatus" />
                    </th>
                    <th className="px-3 py-2 font-medium">
                      <SortHeader label="Fulfillment" k="fulfillmentStatus" />
                    </th>
                    <th className="px-3 py-2 font-medium">
                      <SortHeader label="Printful" k="printfulStatus" />
                    </th>
                    <th className="px-3 py-2 font-medium">Links</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {visibleOrders.map((row) => {
                    const created = row.createdAt ? new Date(row.createdAt) : null;

                    const cityStateZip = [
                      row.shippingCity,
                      row.shippingState,
                      row.shippingPostalCode,
                    ]
                      .filter(Boolean)
                      .join(" ");

                    const displayFulfillment = isDeliveredRow(row)
                      ? "delivered"
                      : row.fulfillmentStatus;

                    const fulfillmentBadge =
                      displayFulfillment === "delivered" ||
                      displayFulfillment === "shipped"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100"
                        : displayFulfillment === "processing"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100"
                          : displayFulfillment === "error" ||
                              row.jobStatus === "error"
                            ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-100"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100";

                    const key = row.orderId ?? row.jobIds[0] ?? "";
                    const isUpdating = Boolean(key) && updatingKey === key;

                    const printfulOrdersDashboardUrl =
                      "https://www.printful.com/dashboard/default/orders";

                    const hasMultiplePrintfulOrders =
                      (row.printfulOrderIds?.length ?? 0) > 1;

                    const primaryCardLine =
                      row.primaryCardId && row.cardIds.length > 1
                        ? `${row.primaryCardId} + ${row.cardIds.length - 1} more`
                        : row.primaryCardId ?? "n/a";

                    return (
                      <tr key={key || row.jobIds.join(",")} className="align-top">
                        <td className="px-3 py-2">
                          <div className="text-xs text-zinc-800 dark:text-zinc-100">
                            {created
                              ? created.toLocaleDateString() +
                                " " +
                                created.toLocaleTimeString()
                              : "n/a"}
                          </div>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                            Order {shortId(row.orderId)}
                          </div>
                        </td>

                        <td className="px-3 py-2">
                          <div className="text-xs font-medium">{primaryCardLine}</div>
                          {row.amountTotal != null && (
                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                              Order total ${(row.amountTotal / 100).toFixed(2)}
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-2">
                          <div className="text-xs font-medium">{row.quantity}</div>
                        </td>

                        <td className="px-3 py-2">
                          <div className="text-xs font-medium">
                            {row.shippingName ?? row.email ?? "n/a"}
                          </div>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                            {cityStateZip || ""}
                          </div>
                        </td>

                        <td className="px-3 py-2">
                          <span className="text-xs">{row.paymentStatus ?? "n/a"}</span>
                        </td>

                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-[10px] font-medium ${fulfillmentBadge}`}
                          >
                            {displayFulfillment || "pending"}
                          </span>
                        </td>

                        <td className="px-3 py-2">
                          <div className="text-xs">{row.printfulStatus ?? "n/a"}</div>
                          {row.printfulOrderId && (
                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                              id {row.printfulOrderId}
                              {hasMultiplePrintfulOrders ? " (multiple)" : ""}
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1 text-[10px]">
                            {row.printFileUrls.length > 0 && (
                              <details>
                                <summary className="cursor-pointer text-indigo-600 hover:underline dark:text-indigo-400">
                                  Print files ({row.printFileUrls.length})
                                </summary>
                                <div className="mt-1 flex flex-col gap-1">
                                  {row.printFileUrls.map((url, idx) => (
                                    <a
                                      key={url + idx}
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-indigo-600 hover:underline dark:text-indigo-400"
                                    >
                                      Print file {idx + 1}
                                    </a>
                                  ))}
                                </div>
                              </details>
                            )}

                            {row.trackingUrl && (
                              <a
                                href={row.trackingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-600 hover:underline dark:text-indigo-400"
                              >
                                Tracking
                              </a>
                            )}

                            {row.printfulOrderId && (
                              <a
                                href={printfulOrdersDashboardUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-600 hover:underline dark:text-indigo-400"
                              >
                                Open Printful orders (search {row.printfulOrderId})
                              </a>
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              disabled={
                                String(displayFulfillment).toLowerCase() === "shipped" ||
                                String(displayFulfillment).toLowerCase() ===
                                  "delivered" ||
                                isUpdating
                              }
                              onClick={() => updateFulfillmentForOrder(row, "shipped")}
                              className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isUpdating
                                ? "Updating…"
                                : String(displayFulfillment).toLowerCase() === "shipped" ||
                                    String(displayFulfillment).toLowerCase() ===
                                      "delivered"
                                  ? "Shipped"
                                  : "Mark shipped"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
