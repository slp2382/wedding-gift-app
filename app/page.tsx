// app/page.tsx

import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-emerald-50 to-stone-100 text-emerald-950 dark:from-emerald-950 dark:via-emerald-950 dark:to-emerald-950 dark:text-emerald-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Top nav / wordmark */}
        <header className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* favicon logo */}
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-2xl border border-emerald-800 bg-emerald-900 shadow-md shadow-emerald-500/20 dark:border-emerald-700 dark:bg-emerald-900 dark:shadow-emerald-700/40">
              <img
                src="/favicon.ico"
                alt="GiftLink logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="leading-tight">
              <p className="text-lg font-semibold tracking-tight">GiftLink</p>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-200/80">
                QR powered wedding gifts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/shop"
              className="hidden rounded-full border border-emerald-500/70 px-3 py-1.5 text-xs font-medium text-emerald-800 underline-offset-4 hover:bg-emerald-50 hover:text-emerald-900 dark:border-emerald-300/80 dark:text-emerald-50 dark:hover:bg-emerald-900/50 md:inline-flex"
            >
              Order Cards
            </Link>
          </div>
        </header>

        {/* Hero */}
        <main className="space-y-24 pb-16">
          <section className="grid gap-10 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:items-center">
            <div className="space-y-5">
              <p className="inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm backdrop-blur dark:border-emerald-500/50 dark:bg-emerald-900/60 dark:text-emerald-200">
                New · Cashless wedding gifts
              </p>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Physical wedding cards with{" "}
                <span className="bg-gradient-to-r from-emerald-700 via-emerald-500 to-emerald-300 bg-clip-text text-transparent">
                  scannable gift links
                </span>
                .
              </h1>
              <p className="max-w-xl text-sm text-emerald-900/80 dark:text-emerald-100/80">
                GiftLink turns a simple card into a QR powered gift. Guests scan a
                card, load a monetary gift through Stripe, and the couple scans the
                same card to claim their funds later. No envelopes, no loose cash.
              </p>

              <div className="flex flex-wrap gap-3">
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-medium text-emerald-50 shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring focus-visible:ring-emerald-500/60 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                >
                  How GiftLink works
                </a>
                <Link
                  href="/shop"
                  className="inline-flex items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-50/80 px-4 py-2.5 text-sm font-medium text-emerald-900 shadow-sm hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring focus-visible:ring-emerald-500/40 dark:border-emerald-700 dark:bg-emerald-900/70 dark:text-emerald-50 dark:hover:bg-emerald-900"
                >
                  Order Cards
                </Link>
              </div>

              <p className="text-[11px] text-emerald-900/70 dark:text-emerald-200/80">
                Couples keep the gift amount. Guests cover a small service fee.
                Payments are handled securely by Stripe.
              </p>
            </div>

            {/* Hero image: real GiftLink card */}
            <div className="relative">
              <div className="pointer-events-none absolute -inset-6 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-emerald-400/10 to-emerald-300/10 blur-2xl dark:from-emerald-500/15 dark:via-emerald-400/15 dark:to-emerald-300/15" />
              <div className="relative rounded-3xl border border-emerald-200/80 bg-stone-50/95 p-5 shadow-xl shadow-emerald-100/70 backdrop-blur-sm dark:border-emerald-700/70 dark:bg-emerald-950/90 dark:shadow-none">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
                  A real GiftLink card
                </p>
                <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-stone-50 dark:border-emerald-800 dark:bg-emerald-950">
                  <Image
                    src="/Example_Card.png"
                    alt="Inside view of a GiftLink card showing a QR code and Congratulations message"
                    width={768}
                    height={768}
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="mt-2 text-[11px] text-emerald-900/80 dark:text-emerald-100/80">
                  Each card has its own unique QR code that guests can scan to send
                  a gift, and the couple can later scan to claim it.
                </p>
              </div>
            </div>
          </section>

          {/* How it works */}
          <section id="how-it-works" className="space-y-6">
            <div className="space-y-2 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
                How it works
              </p>
              <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
                Three simple steps — one QR code
              </h2>
              <p className="mx-auto max-w-2xl text-sm text-emerald-900/80 dark:text-emerald-100/80">
                Every GiftLink card carries a single QR code. Givers use it to load
                cash gifts, and recipients use the same code to claim them
                instantly.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-emerald-100/80 bg-stone-50/90 p-4 text-sm shadow-sm dark:border-emerald-800/70 dark:bg-emerald-950/80">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600/80 dark:text-emerald-300/80">
                  1 · Gift
                </p>
                <h3 className="text-sm font-semibold">Buy a GiftLink card</h3>
                <p className="mt-2 text-xs text-emerald-900/80 dark:text-emerald-100/80">
                  Pick up a GiftLink card from a partner shop or order a pack
                  online. Each one comes with its own unique QR code, ready to
                  personalize.
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-100/80 bg-stone-50/90 p-4 text-sm shadow-sm dark:border-emerald-800/70 dark:bg-emerald-950/80">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600/80 dark:text-emerald-300/80">
                  2 · Link
                </p>
                <h3 className="text-sm font-semibold">
                  Scan the QR to load your gift
                </h3>
                <p className="mt-2 text-xs text-emerald-900/80 dark:text-emerald-100/80">
                  Givers scan the card&apos;s QR code, enter their name, note, and
                  amount, and complete payment securely through Stripe.
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-100/80 bg-stone-50/90 p-4 text-sm shadow-sm dark:border-emerald-800/70 dark:bg-emerald-950/80">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600/80 dark:text-emerald-300/80">
                  3 · Give
                </p>
                <h3 className="text-sm font-semibold">
                  The recipient scans to claim
                </h3>
                <p className="mt-2 text-xs text-emerald-900/80 dark:text-emerald-100/80">
                  The recipient scans that same QR code to instantly claim and
                  deposit their gift through our secure payment system.
                </p>
              </div>
            </div>
          </section>

          {/* CTAs for cards & locations */}
          <section className="space-y-4 rounded-3xl border border-emerald-100/80 bg-stone-50/95 p-6 shadow-lg shadow-emerald-100/70 dark:border-emerald-800 dark:bg-emerald-950/85 dark:shadow-none">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
                  For couples and shops
                </p>
                <h2 className="text-lg font-semibold tracking-tight">
                  Ready to put GiftLink in the real world?
                </h2>
                <p className="text-sm text-emerald-900/80 dark:text-emerald-100/80">
                  We are rolling out physical GiftLink cards with select shops. You
                  can order cards directly online today.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/shop"
                  className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-medium text-emerald-50 shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring focus-visible:ring-emerald-500/60 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                >
                  Order GiftLink card packs
                </Link>
                <Link
                  href="/locations"
                  className="inline-flex items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-50/80 px-4 py-2.5 text-sm font-medium text-emerald-900 shadow-sm hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring focus-visible:ring-emerald-500/40 dark:border-emerald-700 dark:bg-emerald-900/70 dark:text-emerald-50 dark:hover:bg-emerald-900"
                >
                  Find retail locations
                </Link>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="mt-6 border-t border-emerald-100/80 pt-4 text-[11px] text-emerald-800/80 dark:border-emerald-800 dark:text-emerald-200/80">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>© {new Date().getFullYear()} GiftLink. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="#" className="hover:underline">
                Terms
              </Link>
              <Link href="#" className="hover:underline">
                Privacy
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
