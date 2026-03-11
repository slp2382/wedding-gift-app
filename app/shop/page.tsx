"use client";

import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import ShopPageClient from "./ShopPageClient";
import { useCart } from "../providers/CartProvider";
import QuantityDiscountModal from "../components/QuantityDiscountModal";

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-sky-50 via-sky-50 to-slate-100 px-4 py-10 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950" />
      }
    >
      <ShopPageContent />
    </Suspense>
  );
}

function ShopPageContent() {
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get("status") === "success";
  const { itemCount } = useCart();

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-sky-50 to-slate-100 px-4 py-6 text-slate-950 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950 dark:text-slate-50">
      <QuantityDiscountModal />

      <div className="mx-auto flex min-h-[90vh] max-w-5xl flex-col pb-28">
        <header className="mb-8 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/giftlink_logo.svg"
              alt="Givio Cards"
              width={7000}
              height={7000}
              className="h-24 w-auto sm:h-28"
              priority
            />
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-sky-200/80 bg-sky-50/80 px-4 py-2 text-sm font-medium text-slate-950 shadow-sm transition hover:bg-sky-100 focus-visible:outline-none focus-visible:ring focus-visible:ring-sky-500/40 dark:border-sky-700 dark:bg-sky-950/70 dark:text-slate-50 dark:hover:bg-sky-950"
            >
              Return home
            </Link>

            <Link
              href="/cart"
              className="inline-flex items-center justify-center rounded-full bg-sky-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-600 focus-visible:outline-none focus-visible:ring focus-visible:ring-sky-500/60 dark:bg-sky-500 dark:hover:bg-sky-400"
            >
              Cart {itemCount > 0 ? `(${itemCount})` : ""}
            </Link>
          </div>
        </header>

        <main className="flex-1 space-y-6">
          <section className="space-y-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
              Shop
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Givio Cards shop
            </h1>
            <p className="mx-auto max-w-2xl text-sm text-slate-900/80 dark:text-slate-100/80">
              Choose your card design and quantity, then add them to your cart.
            </p>
          </section>

          {isSuccess && (
            <section className="relative mx-auto w-full max-w-3xl">
              <div className="pointer-events-none absolute inset-x-0 -top-6 h-24 rounded-full bg-sky-400/20 blur-3xl dark:bg-sky-500/10" />

              <div className="relative overflow-hidden rounded-2xl border border-sky-200/80 bg-slate-50/95 px-4 py-5 text-slate-950 shadow-lg shadow-sky-100/70 backdrop-blur-sm dark:border-sky-700/70 dark:bg-slate-950/90 dark:text-slate-50 dark:shadow-none sm:px-6 sm:py-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-700 shadow-inner dark:bg-sky-900/60 dark:text-sky-200">
                    <span className="text-xl">✓</span>
                  </div>

                  <div className="flex-1">
                    <h2 className="text-base font-semibold sm:text-lg">
                      Order placed successfully
                    </h2>

                    <p className="mt-1 text-sm text-slate-900/80 dark:text-slate-100/80">
                      Your Givio Cards order is on its way to printing. You will
                      receive updates as it moves through printing and shipping.
                    </p>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:gap-2">
                      <Link
                        href="/shop"
                        className="inline-flex flex-1 items-center justify-center rounded-full bg-sky-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-600 focus-visible:outline-none focus-visible:ring focus-visible:ring-sky-500/60 dark:bg-sky-500 dark:hover:bg-sky-400"
                      >
                        Return to shop
                      </Link>

                      <Link
                        href="/"
                        className="inline-flex flex-1 items-center justify-center rounded-full border border-sky-200/80 bg-sky-50/80 px-4 py-2 text-sm font-medium text-slate-950 shadow-sm transition hover:bg-sky-100 focus-visible:outline-none focus-visible:ring focus-visible:ring-sky-500/40 dark:border-sky-700 dark:bg-sky-950/70 dark:text-slate-50 dark:hover:bg-sky-950"
                      >
                        Return home
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="rounded-3xl border border-sky-200/80 bg-slate-50/95 p-4 shadow-lg shadow-sky-100/70 backdrop-blur-sm dark:border-sky-700/70 dark:bg-slate-950/90 dark:shadow-none sm:p-6">
            <ShopPageClient />
          </section>
        </main>
      </div>

      {itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-[100] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
          <div className="mx-auto max-w-5xl rounded-2xl border border-sky-200/80 bg-slate-50/95 shadow-2xl shadow-sky-200/50 backdrop-blur-sm dark:border-sky-700/70 dark:bg-slate-950/95 dark:shadow-none">
            <div className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                  {itemCount} card{itemCount === 1 ? "" : "s"} in your cart
                </p>
                <p className="text-xs text-slate-700/70 dark:text-slate-100/70">
                  Review your selection before checkout
                </p>
              </div>

              <Link
                href="/cart"
                className="shrink-0 rounded-full bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:bg-sky-500 dark:hover:bg-sky-400"
              >
                Proceed to cart
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}