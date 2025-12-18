"use client";

import { useEffect, useMemo, useState } from "react";

type AdminOrderRow = {
  jobId: string;
  createdAt: string | null;
  cardId: string | null;
  orderId: string | null;

  fulfillmentStatus: string;
  printfulStatus: string | null;
  printfulOrderId: number | string | null;

  jobStatus: string | null;
  errorMessage: string | null;

  paymentStatus: string | null;

  shippingName: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingPostalCode: string | null;

  email: string | null;
  amountTotal: number | null;
  printFileUrl: string | null;

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

const FULFILLMENT_FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "error", label: "Error" },
] as const;

type FilterKey = (typeof FULFILLMENT_FILTERS)[number]["key"];

type SortKey =
  | "createdAt"
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

export default function AdminOrdersPage() {
  const [fetchState, setFetchState] = useState<FetchState>({ state: "idle" });
  const [filter, setFilter] = useState<FilterKey>("pending");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

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

  async function updateFulfillment(jobId: string, status: string) {
    try {
      setUpdatingId(jobId);
      const res = await fetch("/api/admin/orders/updateFulfillment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, fulfillmentStatus: status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to update fulfillment status");
      }
      await loadOrders();
    } catch (err) {
      console.error(err);
      alert(
        err instanceof Error
          ? err.message
          : "Failed to update fulfillment status",
      );
    } finally {
      setUpdatingId(null);
    }
  }

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

  const visibleOrders = useMemo(() => {
    if (fetchState.state !== "loaded") return [];

    const base = fetchState.data;

    const filtered =
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

    const sorted = [...filtered].sort((a, b) => {
      let av: any = null;
      let bv: any = null;

      if (sortKey === "createdAt") {
        av = parseDateMs(a.createdAt);
        bv = parseDateMs(b.createdAt);
      } else if (sortKey === "cardId") {
        av = a.cardId ?? "";
        bv = b.cardId ?? "";
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
  }, [fetchState, filter, sortKey, sortDir]);

  function SortHeader(props: { label: string; k: SortKey }) {
    const active = sortKey === props.k;
    const arrow = active ? (sortDir === "asc" ? "▲" : "▼") : "↕";
    return (
      <button
        type="button"
        onClick={() => toggleSort(props.k)}
        className={`inline-flex items-center gap-1 ${
          active
            ? "text-zinc-800 dark:text-zinc-100"
            : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        }`}
      >
        <span className="font-medium">{props.label}</span>
        <span className="text-[10px]">{arrow}</span>
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              GiftLink admin
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Card pack orders
            </h1>
          </div>
          <button
            type="button"
            onClick={loadOrders}
            className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Refresh
          </button>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2 text-sm">
              {FULFILLMENT_FILTERS.map((f) => (
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

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Showing {visibleOrders.length} of{" "}
              {fetchState.state === "loaded" ? fetchState.data.length : 0} print
              jobs
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
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">
                      <SortHeader label="Created" k="createdAt" />
                    </th>
                    <th className="px-3 py-2 font-medium">
                      <SortHeader label="Card" k="cardId" />
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
                    const created = row.createdAt
                      ? new Date(row.createdAt)
                      : null;

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
                      displayFulfillment === "delivered"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100"
                        : displayFulfillment === "shipped"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100"
                          : displayFulfillment === "processing"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100"
                            : displayFulfillment === "error" ||
                                row.jobStatus === "error"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-100"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100";

                    const isUpdating = updatingId === row.jobId;

                    const printfulOrdersDashboardUrl =
                      "https://www.printful.com/dashboard/default/orders";

                    return (
                      <tr key={row.jobId} className="align-top">
                        <td className="px-3 py-2">
                          <div className="text-xs text-zinc-800 dark:text-zinc-100">
                            {created
                              ? created.toLocaleDateString() +
                                " " +
                                created.toLocaleTimeString()
                              : "n/a"}
                          </div>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                            Job {row.jobId.slice(0, 8)}
                          </div>
                        </td>

                        <td className="px-3 py-2">
                          <div className="text-xs font-medium">
                            {row.cardId ?? "unknown"}
                          </div>
                          {row.amountTotal != null && (
                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                              Order total ${row.amountTotal.toFixed(2)}
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-2">
                          <div className="text-xs text-zinc-800 dark:text-zinc-100">
                            {row.shippingName ?? row.email ?? "unknown"}
                          </div>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                            {cityStateZip || "no address"}
                          </div>
                        </td>

                        <td className="px-3 py-2">
                          <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                            {row.paymentStatus ?? "unknown"}
                          </span>
                        </td>

                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${fulfillmentBadge}`}
                          >
                            {displayFulfillment}
                          </span>

                          {displayFulfillment === "delivered" &&
                            (row.deliveredAt || row.shipmentStatus) && (
                              <div className="mt-1 text-[10px] text-zinc-600 dark:text-zinc-300">
                                {row.deliveredAt
                                  ? `Delivered ${new Date(row.deliveredAt).toLocaleDateString()}`
                                  : row.shipmentStatus}
                              </div>
                            )}

                          {row.errorMessage && (
                            <div className="mt-1 max-w-[180px] text-[10px] text-red-700 dark:text-red-200">
                              {row.errorMessage}
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-2">
                          <div className="text-[10px] text-zinc-700 dark:text-zinc-200">
                            {row.printfulStatus ?? "n/a"}
                          </div>
                          {row.printfulOrderId && (
                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                              id {row.printfulOrderId}
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1 text-[10px]">
                            {row.printFileUrl && (
                              <a
                                href={row.printFileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-600 hover:underline dark:text-indigo-400"
                              >
                                Print file
                              </a>
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
                                Open Printful orders (search {row.printfulOrderId}
                                )
                              </a>
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-2">
                            <label
                              className="sr-only"
                              htmlFor={`fulfillment-${row.jobId}`}
                            >
                              Set fulfillment status
                            </label>

                            <select
                              id={`fulfillment-${row.jobId}`}
                              value={row.fulfillmentStatus}
                              disabled={isUpdating}
                              onChange={(e) =>
                                updateFulfillment(row.jobId, e.target.value)
                              }
                              className="w-[140px] rounded-lg border border-zinc-300 bg-white px-2 py-1 text-[10px] font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
                            >
                              <option value="pending">pending</option>
                              <option value="processing">processing</option>
                              <option value="shipped">shipped</option>
                              <option value="delivered">delivered</option>
                              <option value="error">error</option>
                            </select>

                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                              {isUpdating ? "Updating…" : " "}
                            </div>
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
