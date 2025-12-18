// app/admin/orders/page.tsx

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
  carrier?: string | null;
  service?: string | null;
  trackingEmailSentAt?: string | null;
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
  | "payment"
  | "fulfillment"
  | "printful"
  | "orderTotal";

type SortState = { key: SortKey; dir: "asc" | "desc" };

function normStatus(v: any): string {
  return String(v ?? "").trim().toLowerCase();
}

function safeTime(v: string | null | undefined): number {
  if (!v) return 0;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
}

function computeDisplayFulfillment(
  row: AdminOrderRow,
): "pending" | "processing" | "shipped" | "delivered" | "error" {
  if (
    row.fulfillmentStatus === "error" ||
    row.jobStatus === "error" ||
    Boolean(row.errorMessage)
  ) {
    return "error";
  }

  const shipmentStatus = normStatus(row.shipmentStatus);
  const deliveredAt = safeTime(row.deliveredAt);
  const shippedAt = safeTime(row.shippedAt);

  if (shipmentStatus === "delivered" || deliveredAt > 0) return "delivered";
  if (shipmentStatus === "shipped" || shipmentStatus === "in_transit" || shippedAt > 0) {
    return "shipped";
  }

  if (row.fulfillmentStatus === "processing") return "processing";
  if (row.fulfillmentStatus === "shipped") return "shipped";
  if (row.fulfillmentStatus === "delivered") return "delivered";

  return "pending";
}

function sortIndicator(sort: SortState, key: SortKey): string {
  if (sort.key !== key) return "";
  return sort.dir === "asc" ? " ▲" : " ▼";
}

function compareStrings(a: any, b: any): number {
  const as = String(a ?? "");
  const bs = String(b ?? "");
  return as.localeCompare(bs, undefined, { sensitivity: "base" });
}

export default function AdminOrdersPage() {
  const [fetchState, setFetchState] = useState<FetchState>({ state: "idle" });
  const [filter, setFilter] = useState<FilterKey>("pending");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>({ key: "createdAt", dir: "desc" });

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

  function toggleSort(key: SortKey) {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
    });
  }

  const filteredOrders = useMemo(() => {
    if (fetchState.state !== "loaded") return [];

    const rows = fetchState.data.map((r) => ({
      ...r,
      __displayFulfillment: computeDisplayFulfillment(r),
    })) as (AdminOrderRow & {
      __displayFulfillment: ReturnType<typeof computeDisplayFulfillment>;
    })[];

    const filtered =
      filter === "all"
        ? rows
        : filter === "error"
          ? rows.filter((row) => row.__displayFulfillment === "error")
          : rows.filter((row) => row.__displayFulfillment === filter);

    const dir = sort.dir === "asc" ? 1 : -1;

    const sorted = [...filtered].sort((a, b) => {
      switch (sort.key) {
        case "createdAt":
          return (safeTime(a.createdAt) - safeTime(b.createdAt)) * dir;

        case "cardId":
          return compareStrings(a.cardId, b.cardId) * dir;

        case "customer":
          return (
            compareStrings(a.shippingName ?? a.email, b.shippingName ?? b.email) *
            dir
          );

        case "payment":
          return compareStrings(a.paymentStatus, b.paymentStatus) * dir;

        case "fulfillment":
          return compareStrings(a.__displayFulfillment, b.__displayFulfillment) * dir;

        case "printful":
          return compareStrings(a.printfulStatus, b.printfulStatus) * dir;

        case "orderTotal":
          return ((a.amountTotal ?? 0) - (b.amountTotal ?? 0)) * dir;

        default:
          return 0;
      }
    });

    return sorted.map(({ __displayFulfillment: _ignored, ...rest }) => rest);
  }, [fetchState, filter, sort]);

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
        err instanceof Error ? err.message : "Failed to update fulfillment status",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              GiftLink admin
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">Card pack orders</h1>
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
              Showing {filteredOrders.length} of{" "}
              {fetchState.state === "loaded" ? fetchState.data.length : 0} print jobs
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

          {fetchState.state === "loaded" && filteredOrders.length === 0 && (
            <div className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No orders found for this filter.
            </div>
          )}

          {fetchState.state === "loaded" && filteredOrders.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">
                      <button
                        type="button"
                        onClick={() => toggleSort("createdAt")}
                        className="hover:underline"
                      >
                        Created{sortIndicator(sort, "createdAt")}
                      </button>
                    </th>
                    <th className="px-3 py-2 font-medium">
                      <button
                        type="button"
                        onClick={() => toggleSort("cardId")}
                        className="hover:underline"
                      >
                        Card{sortIndicator(sort, "cardId")}
                      </button>
                    </th>
                    <th className="px-3 py-2 font-medium">
                      <button
                        type="button"
                        onClick={() => toggleSort("customer")}
                        className="hover:underline"
                      >
                        Customer{sortIndicator(sort, "customer")}
                      </button>
                    </th>
                    <th className="px-3 py-2 font-medium">
                      <button
                        type="button"
                        onClick={() => toggleSort("payment")}
                        className="hover:underline"
                      >
                        Payment{sortIndicator(sort, "payment")}
                      </button>
                    </th>
                    <th className="px-3 py-2 font-medium">
                      <button
                        type="button"
                        onClick={() => toggleSort("fulfillment")}
                        className="hover:underline"
                      >
                        Fulfillment{sortIndicator(sort, "fulfillment")}
                      </button>
                    </th>
                    <th className="px-3 py-2 font-medium">
                      <button
                        type="button"
                        onClick={() => toggleSort("printful")}
                        className="hover:underline"
                      >
                        Printful{sortIndicator(sort, "printful")}
                      </button>
                    </th>
                    <th className="px-3 py-2 font-medium">Links</th>
                    <th className="px-3 py-2 font-medium">
                      <button
                        type="button"
                        onClick={() => toggleSort("orderTotal")}
                        className="hover:underline"
                      >
                        Actions{sortIndicator(sort, "orderTotal")}
                      </button>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredOrders.map((row) => {
                    const created = row.createdAt ? new Date(row.createdAt) : null;

                    const cityStateZip = [
                      row.shippingCity,
                      row.shippingState,
                      row.shippingPostalCode,
                    ]
                      .filter(Boolean)
                      .join(" ");

                    const displayFulfillment = computeDisplayFulfillment(row);

                    const fulfillmentBadge =
                      displayFulfillment === "delivered" ||
                      displayFulfillment === "shipped"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100"
                        : displayFulfillment === "processing"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100"
                          : displayFulfillment === "error"
                            ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-100"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100";

                    const isUpdating = updatingId === row.jobId;

                    const printfulOrdersDashboardUrl =
                      "https://www.printful.com/dashboard/default/orders";

                    const carrierService = [row.carrier, row.service]
                      .filter(Boolean)
                      .join(" ");

                    const deliveredAt = row.deliveredAt ? new Date(row.deliveredAt) : null;

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

                          {displayFulfillment === "delivered" && deliveredAt && (
                            <div className="mt-1 text-[10px] text-zinc-600 dark:text-zinc-300">
                              Delivered {deliveredAt.toLocaleDateString()}
                            </div>
                          )}

                          {carrierService && (
                            <div className="mt-1 text-[10px] text-zinc-600 dark:text-zinc-300">
                              {carrierService}
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

                            {(row.trackingUrl || row.trackingNumber) && (
                              <a
                                href={row.trackingUrl ?? undefined}
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
                                displayFulfillment === "shipped" ||
                                displayFulfillment === "delivered" ||
                                isUpdating
                              }
                              onClick={() => updateFulfillment(row.jobId, "shipped")}
                              className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isUpdating
                                ? "Updating…"
                                : displayFulfillment === "delivered"
                                  ? "Delivered"
                                  : displayFulfillment === "shipped"
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

              <div className="mt-3 text-[10px] text-zinc-500 dark:text-zinc-400">
                Sorting: click a column header to sort, click again to reverse direction.
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
