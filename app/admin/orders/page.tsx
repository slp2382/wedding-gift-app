//app/admin/orders.page.tsx

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
  { key: "error", label: "Error" },
] as const;

type FilterKey = (typeof FULFILLMENT_FILTERS)[number]["key"];

export default function AdminOrdersPage() {
  const [fetchState, setFetchState] = useState<FetchState>({ state: "idle" });
  const [filter, setFilter] = useState<FilterKey>("pending");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
        message:
          err instanceof Error ? err.message : "Failed to fetch orders",
      });
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    if (fetchState.state !== "loaded") return [];
    if (filter === "all") return fetchState.data;
    if (filter === "error") {
      return fetchState.data.filter(
        (row) =>
          row.fulfillmentStatus === "error" ||
          row.jobStatus === "error" ||
          Boolean(row.errorMessage),
      );
    }
    return fetchState.data.filter((row) => row.fulfillmentStatus === filter);
  }, [fetchState, filter]);

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

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
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
              Showing {filteredOrders.length} of{" "}
              {fetchState.state === "loaded" ? fetchState.data.length : 0}{" "}
              print jobs
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
                    <th className="px-3 py-2 font-medium">Created</th>
                    <th className="px-3 py-2 font-medium">Card</th>
                    <th className="px-3 py-2 font-medium">Customer</th>
                    <th className="px-3 py-2 font-medium">Payment</th>
                    <th className="px-3 py-2 font-medium">Fulfillment</th>
                    <th className="px-3 py-2 font-medium">Printful</th>
                    <th className="px-3 py-2 font-medium">Links</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredOrders.map((row) => {
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

                    const fulfillmentBadge =
                      row.fulfillmentStatus === "shipped"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100"
                        : row.fulfillmentStatus === "processing"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100"
                        : row.fulfillmentStatus === "error" ||
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
                            {row.fulfillmentStatus}
                          </span>
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
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              disabled={
                                row.fulfillmentStatus === "shipped" ||
                                isUpdating
                              }
                              onClick={() =>
                                updateFulfillment(row.jobId, "shipped")
                              }
                              className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isUpdating
                                ? "Updating…"
                                : row.fulfillmentStatus === "shipped"
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
