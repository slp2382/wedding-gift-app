// app/page.tsx

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import EmailCaptureModal from "./components/EmailCaptureModal";

export default function HomePage() {
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const threshold = 8;

    const onScroll = () => {
      const currentY = window.scrollY;

      // Always show when at (or very near) the top
      if (currentY <= 2) {
        setShowHeader(true);
        lastScrollYRef.current = currentY;
        return;
      }

      const delta = currentY - lastScrollYRef.current;

      // Ignore tiny scroll changes to prevent flicker
      if (Math.abs(delta) < threshold) return;

      // Scrolling down -> hide, scrolling up -> show
      if (delta > 0) {
        setShowHeader(false);
      } else {
        setShowHeader(true);
      }

      lastScrollYRef.current = currentY;
    };

    lastScrollYRef.current = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-sky-50 to-slate-100 text-slate-950 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950 dark:text-slate-50">
      <EmailCaptureModal />

      {/* Header: visible initially, hides on scroll down, shows on scroll up */}
      <header
        className={[
          "fixed left-0 right-0 top-0 z-50",
          "border-b border-sky-100/80 bg-sky-50/70 backdrop-blur",
          "dark:border-sky-800/70 dark:bg-slate-950/60",
          "transition-transform duration-200",
          showHeader ? "translate-y-0" : "-translate-y-full",
        ].join(" ")}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5">
          <Link href="/" className="flex items-center">
            <Image
              src="/giftlink_logo.svg"
              alt="GiftLink"
              width={200}
              height={200}
              className="h-12 w-auto max-w-[180px] sm:h-10 sm:max-w-none"
              priority
            />
          </Link>

          <div className="flex items-center gap-4">
            <nav className="hidden items-center gap-6 md:flex">
              <a
                href="#how-it-works"
                className="text-sm font-medium text-slate-900/80 hover:text-slate-950 dark:text-slate-100/80 dark:hover:text-slate-50"
              >
                How it works
              </a>
              <a
                href="#faq"
                className="text-sm font-medium text-slate-900/80 hover:text-slate-950 dark:text-slate-100/80 dark:hover:text-slate-50"
              >
                FAQ
              </a>
            </nav>

            <Link
              href="/shop"
              className="inline-flex items-center justify-center rounded-full bg-sky-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-600 focus-visible:outline-none focus-visible:ring focus-visible:ring-sky-500/60 dark:bg-sky-500 dark:hover:bg-sky-400"
            >
              Shop
            </Link>
          </div>
        </div>
      </header>

      {/* Increased top padding to account for fixed header */}
      <div className="mx-auto max-w-5xl px-4 pb-8 pt-16">
        {/* Hero */}
        <main className="space-y-24 pb-16">
          <section className="grid gap-10 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:items-center">
            <div className="space-y-5">
              <p className="inline-flex items-center rounded-full border border-sky-200/80 bg-sky-50/80 px-3 py-1 text-xs font-medium text-sky-700 shadow-sm backdrop-blur dark:border-sky-500/50 dark:bg-sky-950/60 dark:text-sky-200">
                New · Cashless wedding and birthday gifts
              </p>

              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Physical event cards with{" "}
                <span className="bg-gradient-to-r from-sky-700 via-sky-500 to-sky-300 bg-clip-text text-transparent">
                  scannable gift links
                </span>
                .
              </h1>

              <p className="max-w-xl text-sm text-slate-900/80 dark:text-slate-100/80">
                GiftLink turns a simple card into a QR powered gift. Guests scan a
                card, load a monetary gift through Stripe, and the recipient scans
                the same card to claim their funds later. No ATM, no loose cash.
              </p>

              <div className="flex flex-wrap gap-3">
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center rounded-full bg-sky-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-600 focus-visible:outline-none focus-visible:ring focus-visible:ring-sky-500/60 dark:bg-sky-500 dark:hover:bg-sky-400"
                >
                  How GiftLink works
                </a>

                <Link
                  href="/shop"
                  className="inline-flex items-center justify-center rounded-full border border-sky-200/80 bg-sky-50/80 px-4 py-2.5 text-sm font-medium text-slate-950 shadow-sm hover:bg-sky-100 focus-visible:outline-none focus-visible:ring focus-visible:ring-sky-500/40 dark:border-sky-700 dark:bg-sky-950/70 dark:text-slate-50 dark:hover:bg-sky-950"
                >
                  Shop
                </Link>
              </div>

              <p className="text-[11px] text-slate-900/70 dark:text-slate-200/80">
                Recipients keep the gift amount. Guests cover a small service fee.
                Payments are handled securely by Stripe.
              </p>
            </div>

            {/* Hero image */}
            <div className="relative">
              <div className="pointer-events-none absolute -inset-6 rounded-3xl bg-gradient-to-br from-sky-500/10 via-sky-400/10 to-sky-300/10 blur-2xl dark:from-sky-500/15 dark:via-sky-400/15 dark:to-sky-300/15" />
              <div className="relative rounded-3xl border border-sky-200/80 bg-slate-50/95 p-5 shadow-xl shadow-sky-100/70 backdrop-blur-sm dark:border-sky-700/70 dark:bg-slate-950/90 dark:shadow-none">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
                  A real GiftLink card
                </p>

                <div className="overflow-hidden rounded-2xl border border-sky-100 bg-slate-50 dark:border-sky-800 dark:bg-slate-950">
                  <Image
                    src="/Example_Card.png"
                    alt="Inside view of a GiftLink card showing a QR code and Congratulations message"
                    width={768}
                    height={768}
                    className="h-full w-full object-cover"
                    priority
                  />
                </div>

                <p className="mt-2 text-[11px] text-slate-900/80 dark:text-slate-100/80">
                  Each card has its own unique QR code that guests can scan to send
                  a gift, and the recipient can later scan to claim it.
                </p>
              </div>
            </div>
          </section>

          {/* How it works */}
          <section id="how-it-works" className="scroll-mt-24 space-y-6">
            <div className="space-y-2 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
                How it works
              </p>
              <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
                Three simple steps — one QR code
              </h2>
              <p className="mx-auto max-w-2xl text-sm text-slate-900/80 dark:text-slate-100/80">
                Every GiftLink card carries a single QR code. Givers use it to load
                cash gifts, and recipients use the same code to claim them
                instantly.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-sky-100/80 bg-slate-50/90 p-4 text-sm shadow-sm dark:border-sky-800/70 dark:bg-slate-950/80">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700/80 dark:text-sky-300/80">
                  1 · Gift
                </p>
                <h3 className="text-sm font-semibold">Buy a GiftLink card</h3>
                <p className="mt-2 text-xs text-slate-900/80 dark:text-slate-100/80">
                  Pick up a GiftLink card from a partner shop or order a pack
                  online. Each one comes with its own unique QR code, ready to
                  personalize.
                </p>
              </div>

              <div className="rounded-2xl border border-sky-100/80 bg-slate-50/90 p-4 text-sm shadow-sm dark:border-sky-800/70 dark:bg-slate-950/80">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700/80 dark:text-sky-300/80">
                  2 · Link
                </p>
                <h3 className="text-sm font-semibold">
                  Scan the QR to load your gift
                </h3>
                <p className="mt-2 text-xs text-slate-900/80 dark:text-slate-100/80">
                  Givers scan the card&apos;s QR code, enter their name, note, and
                  amount, and complete payment securely through Stripe.
                </p>
              </div>

              <div className="rounded-2xl border border-sky-100/80 bg-slate-50/90 p-4 text-sm shadow-sm dark:border-sky-800/70 dark:bg-slate-950/80">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700/80 dark:text-sky-300/80">
                  3 · Give
                </p>
                <h3 className="text-sm font-semibold">
                  The recipient scans to claim
                </h3>
                <p className="mt-2 text-xs text-slate-900/80 dark:text-slate-100/80">
                  The recipient scans that same QR code to instantly claim and
                  deposit their gift through our secure payment system.
                </p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="space-y-4 rounded-3xl border border-sky-100/80 bg-slate-50/95 p-6 shadow-lg shadow-sky-100/70 dark:border-sky-800 dark:bg-slate-950/85 dark:shadow-none">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
                  For recipients and shops
                </p>
                <h2 className="text-lg font-semibold tracking-tight">
                  Ready to put GiftLink in the real world?
                </h2>
                <p className="text-sm text-slate-900/80 dark:text-slate-100/80">
                  We are rolling out physical GiftLink cards with select shops. You
                  can order cards directly online today.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/shop"
                  className="inline-flex items-center justify-center rounded-full bg-sky-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-600 focus-visible:outline-none focus-visible:ring focus-visible:ring-sky-500/60 dark:bg-sky-500 dark:hover:bg-sky-400"
                >
                  Order GiftLink card packs
                </Link>
                <Link
                  href="/locations"
                  className="inline-flex items-center justify-center rounded-full border border-sky-200/80 bg-sky-50/80 px-4 py-2.5 text-sm font-medium text-slate-950 shadow-sm hover:bg-sky-100 focus-visible:outline-none focus-visible:ring focus-visible:ring-sky-500/40 dark:border-sky-700 dark:bg-sky-950/70 dark:text-slate-50 dark:hover:bg-sky-950"
                >
                  Find retail locations
                </Link>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section
            id="faq"
            className="scroll-mt-24 space-y-6 rounded-3xl border border-sky-100/80 bg-slate-50/95 p-6 shadow-sm dark:border-sky-800 dark:bg-slate-950/85"
          >
            <div className="space-y-2 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
                Frequently asked questions
              </p>
              <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
                Answers for recipients and gifters
              </h2>
              <p className="mx-auto max-w-2xl text-sm text-slate-900/80 dark:text-slate-100/80">
                GiftLink is a new way to give and receive event gifts. Here are
                clear answers to the most common questions we hear.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-sky-100/80 bg-white p-4 text-sm shadow-sm dark:border-sky-800/70 dark:bg-slate-950/80">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Is GiftLink safe to use
                </h3>
                <p className="mt-2 text-xs text-slate-900/80 dark:text-slate-100/80">
                  Payments are processed by Stripe. Card details never pass through
                  or live on GiftLink servers. We only store the info needed to
                  link each card to its gift and payout.
                </p>
              </div>

              <div className="rounded-2xl border border-sky-100/80 bg-white p-4 text-sm shadow-sm dark:border-sky-800/70 dark:bg-slate-950/80">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  What fees apply and who pays them
                </h3>
                <p className="mt-2 text-xs text-slate-900/80 dark:text-slate-100/80">
                  Guests pay for the physical card and a small service fee when they
                  send a gift. Recipients keep the full gift amount if using a free
                  transfer method.
                </p>
              </div>

              <div className="rounded-2xl border border-sky-100/80 bg-white p-4 text-sm shadow-sm dark:border-sky-800/70 dark:bg-slate-950/80">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  What if someone loses the card
                </h3>
                <p className="mt-2 text-xs text-slate-900/80 dark:text-slate-100/80">
                  The QR code on the physical card is the key to the gift. We
                  recommend recipients keep cards in a safe place once they are
                  opened. If a card is lost before a payout, contact us.
                </p>
              </div>

              <div className="rounded-2xl border border-sky-100/80 bg-white p-4 text-sm shadow-sm dark:border-sky-800/70 dark:bg-slate-950/80">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  How long can gifts remain unclaimed
                </h3>
                <p className="mt-2 text-xs text-slate-900/80 dark:text-slate-100/80">
                  Funds stay linked to the card until a payout request is made or a
                  year after the card is loaded. submitted and processed.
                </p>
              </div>

              <div className="rounded-2xl border border-sky-100/80 bg-white p-4 text-sm shadow-sm dark:border-sky-800/70 dark:bg-slate-950/80">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Do recipients need an app or account
                </h3>
                <p className="mt-2 text-xs text-slate-900/80 dark:text-slate-100/80">
                  No app is required. Recipients scan the QR code printed inside the
                  card and submit a payout request through a mobile friendly page.
                </p>
              </div>

              <div className="rounded-2xl border border-sky-100/80 bg-white p-4 text-sm shadow-sm dark:border-sky-800/70 dark:bg-slate-950/80">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Which payout methods are supported
                </h3>
                <p className="mt-2 text-xs text-slate-900/80 dark:text-slate-100/80">
                  GiftLink is expanding payout options over time. Currently we
                  support Venmo payouts and bank transfers. Our goal is to give
                  recipients familiar ways to move gift money where they want it
                  easily.
                </p>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="mt-6 border-t border-sky-100/80 pt-4 text-[11px] text-slate-800/80 dark:border-sky-800 dark:text-slate-200/80">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>© {new Date().getFullYear()} GiftLink. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="/terms" className="hover:underline">
                Terms
              </Link>
              <Link href="/privacy" className="hover:underline">
                Privacy
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
