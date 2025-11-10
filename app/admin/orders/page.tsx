"use client";

import { useEffect, useState } from "react";

type Order = {
  id: string;
  stripe_session_id: string;
  email: string | null;
  shipping_name: string | null;
  shipping_address_line1: string | null;
  shipping_address_line2: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_postal_code: string | null;
  shipping_country: string | null;
  items: any | null;
  amount_total: number;
  status: string;
  created_at: string;
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchOrders() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/orders");
      if (!res.ok) {
        throw new Error("Failed to fetch orders");
      }
      const data = await res.json();
      setOrders(data.orders ?? []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  async function markAsShipped(id: string) {
    try {
      setUpdatingId(id);
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status: "shipped" }),
      });

      if (!res.ok) {
        throw new Error("Failed to update order");
      }

      setOrders((prev) =>
        prev.map((order) =>
          order.id === id ? { ...order, status: "shipped" } : order,
        ),
      );
    } catch (err) {
      console.error(err);
      setError("Failed to update order");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 px-4 py-10 dark:bg-zinc-950 dark:text-zinc-50">
      <main className="mx-auto w-full max-w-5xl space-y-6">
        <header className="space-y-2">
          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
            Internal view
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Card pack orders
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Orders created from the shop checkout. Mark them as shipped after
            you fulfill the physical cards.
          </p>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-medium">Orders</h2>
            <button
              onClick={fetchOrders}
              className="rounded-full border border-zinc-300 px-3 py-1 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Refresh
            </button>
          </div>

          {loading && <p className="text-sm text-zinc-500">Loading orders…</p>}

          {error && (
            <p className="text-sm text-red-500">
              {error}
            </p>
          )}

          {!loading && orders.length === 0 && !error && (
            <p className="text-sm text-zinc-500">No orders yet.</p>
          )}

          {orders.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800">
                  <tr>
                    <th className="px-3 py-2">Created</th>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Shipping</th>
                    <th className="px-3 py-2">Items</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const created = new Date(order.created_at);
                    const amountFormatted = (order.amount_total / 100).toFixed(
                      2,
                    );

                    const itemsLabel =
                      order.items && Array.isArray(order.items)
                        ? order.items
                            .map((it: any) => {
                              const p = it.product ?? "card";
                              const q = it.quantity ?? 1;
                              return `${p} x${q}`;
                            })
                            .join(", ")
                        : "card pack";

                    const shippingLines = [
                      order.shipping_name,
                      [
                        order.shipping_address_line1,
                        order.shipping_address_line2,
                      ]
                        .filter(Boolean)
                        .join(" "),
                      [
                        order.shipping_city,
                        order.shipping_state,
                        order.shipping_postal_code,
                      ]
                        .filter(Boolean)
                        .join(", "),
                      order.shipping_country,
                    ]
                      .filter(Boolean)
                      .join(" · ");

                    return (
                      <tr
                        key={order.id}
                        className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                      >
                        <td className="whitespace-nowrap px-3 py-2 align-top text-xs text-zinc-500">
                          {created.toLocaleDateString()}{" "}
                          {created.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-3 py-2 align-top text-xs">
                          <div className="flex flex-col gap-1">
                            {order.email && (
                              <span className="font-medium">
                                {order.email}
                              </span>
                            )}
                            <span className="text-zinc-500">
                              {order.stripe_session_id}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top text-xs">
                          {shippingLines || (
                            <span className="text-zinc-400">No shipping</span>
                          )}
                        </td>
                        <td className="px-3 py-2 align-top text-xs">
                          {itemsLabel}
                        </td>
                        <td className="px-3 py-2 align-top text-xs">
                          ${amountFormatted}
                        </td>
                        <td className="px-3 py-2 align-top text-xs">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              order.status === "shipped"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 align-top text-xs">
                          {order.status !== "shipped" && (
                            <button
                              onClick={() => markAsShipped(order.id)}
                              disabled={updatingId === order.id}
                              className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                            >
                              {updatingId === order.id
                                ? "Updating…"
                                : "Mark shipped"}
                            </button>
                          )}
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
