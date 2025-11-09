"use client";

import { useState } from "react";
import Link from "next/link";

export default function ShopPage() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function handleBuyNow() {
    setErrorMessage(null);
    setStatusMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: "single_card",
        }),
      });

      if (!res.ok) {
        const result = await res.json().catch(() => null);
        const message =
          (result && result.error) ||
          "Could not start checkout. Please try again.";
        setErrorMessage(message);
        setLoading(false);
        return;
      }

      const result = await res.json();
      const url = result.url as string | undefined;

      if (url) {
        window.location.href = url;
      } else {
        setErrorMessage(
          "Stripe did not return a checkout URL. Please try again.",
        );
        setLoading(false);
      }
    } catch (err) {
      console.error("Error starting shop checkout:", err);
      setErrorMessage("Something went wrong while starting checkout.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-indigo-50/60 to-zinc-50 text-zinc-900 dark:from-zinc-950 dark:via-slate-950 dark:to-zinc-950 dark:text-zinc-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Top nav / wordmark */}
        <header className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-400 to-emerald-400 shadow-md shadow-indigo-500/30 dark:shadow-indigo-700/40">
              <span className="text-lg font-semibold text-white">G</span>
            </div>
            <div className="leading-tight">
              <p className="text-lg font-semibold tracking-tight">GiftLink</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Order GiftLink cards
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="text-xs font-medium text-indigo-600 underline-offset-4 hover:text-indigo-500 hover:underline dark:text-indigo-300 dark:hover:text-indigo-200"
          >
            Back to homepage
          </Link>
        </header>

        <main className="space-y-8 pb-10">
          {/* Intro */}
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-300">
              Shop
            </p>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Order GiftLink cards
            </h1>
            <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">
              This is a simple test shop flow for a single GiftLink card
              product. You&apos;ll be redirected to Stripe Checkout to complete
              payment in test mode. In a later version, you&apos;ll be able to
              choose between multiple card designs and pack sizes.
            </p>
          </section>

          {/* Product card */}
          <section className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-lg shadow-indigo-100/60 dark:border-zinc-800 dark:bg-zinc-950/80 dark:shadow-none">
            <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:items-center">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Card product
                </p>
                <h2 className="text-lg font-semibold tracking-tight">
                  GiftLink card (single)
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  A single physical GiftLink card with a unique QR code,
                  pre-linked to your platform. Perfect for testing the full
                  end-to-end experience: card scanning, gift loading, and
                  claiming.
                </p>
                <ul className="mt-2 space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                  <li>• Unique QR code tied to a GiftLink card id</li>
                  <li>• Ready to be printed or added to your demo inventory</li>
                  <li>• Purchased through Stripe test checkout for now</li>
                </ul>
              </div>

              <div className="space-y-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-4 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Price
                    </p>
                    {/* This is just display; real price comes from Stripe price ID */}
                    <p className="text-2xl font-semibold tracking-tight">
                      $5.00
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Display price only — actual amount is configured in
                      Stripe.
                    </p>
                  </div>
                  <div className="hidden text-right text-[11px] text-zinc-500 md:block dark:text-zinc-400">
                    <p>Stripe test mode</p>
                    <p>Use 4242 4242 4242 4242</p>
                  </div>
                </div>

                {errorMessage && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">
                    {errorMessage}
                  </p>
                )}

                {statusMessage && !errorMessage && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    {statusMessage}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={loading}
                  className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring focus-visible:ring-indigo-500/60 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                >
                  {loading ? "Starting checkout…" : "Buy this card (test mode)"}
                </button>

                <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                  You&apos;ll be redirected to Stripe&apos;s secure checkout
                  page. This flow uses test mode and is just a placeholder for
                  future multi-product / multi-quantity ordering.
                </p>
              </div>
            </div>
          </section>

          {/* Back link / hint */}
          <section className="text-xs text-zinc-500 dark:text-zinc-400">
            <p>
              In the future, this page will list multiple card designs and pack
              sizes with quantity selection and a small cart before checkout.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
