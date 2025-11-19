"use client";

import { Suspense } from "react";
import ShopPageClient from "./ShopPageClient";
import Link from "next/link";

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
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );

  const isSuccess = searchParams.get("status") === "success";

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
      {/* Success Banner */}
      {isSuccess && (
        <div className="relative mx-auto mb-6 max-w-3xl">
          {/* Glow */}
          <div className="pointer-events-none absolute inset-x-0 -top-6 h-24 rounded-full bg-emerald-400/20 blur-3xl" />

          <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-4 py-5 text-emerald-900 shadow-sm dark:border-emerald-700/60 dark:bg-gradient-to-br dark:from-emerald-950 dark:to-emerald-900/60 dark:text-emerald-50 sm:px-6 sm:py-6">
            <div className="flex items-start gap-3 sm:gap-4">
              {/* Check Icon */}
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

                {/* Buttons */}
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
