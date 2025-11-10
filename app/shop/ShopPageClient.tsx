"use client";

import { useState } from "react";

export default function ShopPageClient({ status }: { status: string | null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ product: "single_card" }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? "Could not start checkout");
        setLoading(false);
        return;
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url as string;
      } else {
        setError("Checkout URL was not returned");
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong starting checkout");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 px-4 py-10 dark:bg-zinc-950 dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="space-y-3">
          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
            GiftLink Cards shop
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Order physical GiftLink Cards
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Stock up on cards with a printed QR that links to a GiftLink page.
            This early shop is for test orders and small runs while the product
            is in development.
          </p>
        </header>

        {/* Status banners from Stripe redirect */}
        {status === "success" && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
            <p className="font-medium">Order received</p>
            <p className="mt-1">
              We have your test order and the details appear in your internal
              dashboard under card pack orders. You can fulfill it from there.
            </p>
          </div>
        )}

        {status === "cancelled" && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
            <p className="font-medium">Checkout cancelled</p>
            <p className="mt-1">
              The payment was not completed. You can start a new order at any
              time from this page.
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100">
            <p className="font-medium">Something went wrong</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <h2 className="text-base font-semibold">
                GiftLink Card (single)
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                A single folded card with a pre printed QR that links to a
                GiftLink page. Guests scan to load a cash gift, couples scan to
                claim it.
              </p>
            </div>

            <div className="text-right md:text-left">
              <p className="text-xl font-semibold">$5.00</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Stripe test mode only right now
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            <p>
              This is a single card order that uses Stripe test mode. Payments
              do not move real money yet but the full order and shipping flow is
              wired up for testing.
            </p>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 md:w-auto"
            >
              {loading ? "Starting checkout…" : "Buy this card in test mode"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
