// app/admin/page.tsx

import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            GiftLink admin
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Admin control center
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Choose a section to review card pack orders, track Printful
            fulfillment, or process payout requests for couples.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {/* Card pack orders */}
          <Link
            href="/admin/orders"
            className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold">
                  Card pack orders
                </h2>
                <span className="text-xs text-zinc-500 group-hover:text-zinc-700 dark:text-zinc-400 dark:group-hover:text-zinc-200">
                  Open
                </span>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Review physical card orders, see Printful status, and mark
                shipments completed once cards leave your hands.
              </p>
              <div className="mt-2 inline-flex items-center text-xs font-medium text-indigo-600 group-hover:text-indigo-700 dark:text-indigo-400 dark:group-hover:text-indigo-300">
                Go to card pack orders
              </div>
            </div>
          </Link>

          {/* Payouts */}
          <Link
            href="/admin/payouts"
            className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold">
                  Payout requests
                </h2>
                <span className="text-xs text-zinc-500 group-hover:text-zinc-700 dark:text-zinc-400 dark:group-hover:text-zinc-200">
                  Open
                </span>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                View gifts that couples have claimed and process payouts through
                Venmo or Stripe once you confirm details.
              </p>
              <div className="mt-2 inline-flex items-center text-xs font-medium text-indigo-600 group-hover:text-indigo-700 dark:text-indigo-400 dark:group-hover:text-indigo-300">
                Go to payout requests
              </div>
            </div>
          </Link>
        </section>
      </main>
    </div>
  );
}
