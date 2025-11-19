"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ShopPageClient() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Updated image paths
  const cardImages = [
    "/Card1Images/Card1Mockup1.png",
    "/Card1Images/Card1Mockup2.png",
    "/Card1Images/Card1Mockup3.png",
  ];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  function showPrevImage() {
    setCurrentImageIndex((prev) =>
      prev === 0 ? cardImages.length - 1 : prev - 1
    );
  }

  function showNextImage() {
    setCurrentImageIndex((prev) =>
      prev === cardImages.length - 1 ? 0 : prev + 1
    );
  }

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

        {/* Cancellation banner (success handled in page.tsx) */}
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

        {/* Product panel */}
        <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:items-start">
            {/* Image carousel */}
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                <img
                  src={cardImages[currentImageIndex]}
                  alt="GiftLink card preview"
                  className="h-64 w-full object-cover sm:h-72"
                />

                {/* Prev / Next buttons */}
                <button
                  type="button"
                  onClick={showPrevImage}
                  className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-800 shadow-md ring-1 ring-zinc-200 transition hover:bg-white dark:bg-zinc-900/90 dark:text-zinc-50 dark:ring-zinc-700"
                >
                  ‹
                </button>

                <button
                  type="button"
                  onClick={showNextImage}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-800 shadow-md ring-1 ring-zinc-200 transition hover:bg-white dark:bg-zinc-900/90 dark:text-zinc-50 dark:ring-zinc-700"
                >
                  ›
                </button>
              </div>

              {/* Dots */}
              <div className="flex justify-center gap-2">
                {cardImages.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setCurrentImageIndex(index)}
                    className={`h-2.5 w-2.5 rounded-full transition ${
                      index === currentImageIndex
                        ? "bg-zinc-900 dark:bg-zinc-100"
                        : "bg-zinc-300 hover:bg-zinc-400 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Info + CTA */}
            <div className="flex flex-col gap-4">
              <div className="space-y-2">
                <h2 className="text-base font-semibold">
                  GiftLink Card (single)
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  A single folded card with a pre printed QR that links to a
                  GiftLink page. Guests scan to load a gift, couples scan to
                  claim it.
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xl font-semibold">$7.99</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Stripe test environment only right now
                </p>
              </div>

              <div className="space-y-2 border-t border-zinc-200 pt-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 md:w-auto"
                >
                  {loading ? "Starting checkout…" : "Order"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
