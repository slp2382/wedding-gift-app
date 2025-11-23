"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ShopPageClient from "./ShopPageClient";
import { useCart } from "../providers/CartProvider";

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 px-4 py-10 dark:bg-zinc-950" />
      }
    >
      <ShopPageContent />
    </Suspense>
  );
}

function ShopPageContent() {
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get("status") === "success";

  // Pull itemCount directly from provider
  const { itemCount } = useCart();

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
      {/* Top bar with home and cart links */}
      <div className="mx-auto mb-6 flex max-w-5xl items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            GiftLink card shop
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Choose your card size and quantity, then add them to your cart.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
          >
            Return home
          </Link>
          <Link
            href="/cart"
            className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
          >
            Cart {itemCount > 0 ? `(${itemCount})` : ""}
          </Link>
        </div>
      </div>

      {/* Success Banner */}
      {isSuccess && (
        <div className="relative mx-auto mb-6 max-w-3xl">
          <div className="pointer-events-none absolute inset-x-0 -top-6 h-24 rounded-full bg-emerald-400/20 blur-3xl" />

          <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-4 py-5 text-emerald-900 shadow-sm dark:border-emerald-700/60 dark:bg-gradient-to-br dark:from-emerald-950 dark:to-emerald-900/60 dark:text-emerald-50 sm:px-6 sm:py-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-inner dark:bg-emerald-800/80 dark:text-emerald-50">
                <span className="text-xl">✓</span>
              </div>

              <div className="flex-1">
                <h2 className="text-base font-semibold sm:text-lg">
                  Order placed successfully
                </h2>

                <p className="mt-1 text-sm text-emerald-900/80 dark:text-emerald-100/80">
                  Your GiftLink card order is on its way to printing. You will
                  receive updates as it moves through printing and shipping.
                </p>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:gap-2">
                  <Link
                    href="/shop"
                    className="inline-flex flex-1 items-center justify-center rounded-lg border border-zinc-900/10 bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 dark:border-zinc-100/10 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    Return to shop
                  </Link>

                  <Link
                    href="/"
                    className="inline-flex flex-1 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
                  >
                    Return home
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Shop UI */}
      <ShopPageClient />
    </div>
  );
}
