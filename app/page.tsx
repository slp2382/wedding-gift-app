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
      if (currentY < 16) {
        setShowHeader(true);
        lastScrollYRef.current = currentY;
        return;
      }

      // If user scrolls up, show header. If user scrolls down, hide header.
      const lastY = lastScrollYRef.current;
      const delta = currentY - lastY;

      if (Math.abs(delta) < threshold) return;

      if (delta > 0) setShowHeader(false);
      else setShowHeader(true);

      lastScrollYRef.current = currentY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <EmailCaptureModal />

      {/* Header */}
      <header
        className={[
          "fixed inset-x-0 top-0 z-50 transition-transform duration-300",
          showHeader ? "translate-y-0" : "-translate-y-full",
          "bg-slate-950/70 backdrop-blur border-b border-white/10",
        ].join(" ")}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/giftlink_logo.svg"
              alt="Givio Cards"
              width={200}
              height={40}
              priority
            />
          </Link>

          <nav className="flex items-center gap-4">
            <Link
              href="/shop"
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15 transition"
            >
              Shop
            </Link>

            <Link
              href="/faq"
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15 transition"
            >
              FAQ
            </Link>

            <Link
              href="/login"
              className="rounded-xl bg-sky-500/20 px-4 py-2 text-sm font-semibold text-sky-200 hover:bg-sky-500/25 transition"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-24">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                Physical card, one QR, simple payout
              </p>

              <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">
                A modern way to gift
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-100/80">
                A Givio card turns a simple card into a QR powered gift. Guests scan a
                single code to claim, and you choose how to send the money.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/shop"
                  className="rounded-2xl bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-sky-400 transition"
                >
                  Shop cards
                </Link>

                <a
                  href="#how-it-works"
                  className="rounded-2xl bg-white/10 px-6 py-3 text-sm font-semibold hover:bg-white/15 transition"
                >
                  How Givio Cards work
                </a>
              </div>

              <div className="mt-8 flex items-center gap-6 text-sm text-slate-200/80">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                  Secure payouts
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-sky-300" />
                  Works with physical cards
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 rounded-[2rem] bg-sky-500/10 blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-xl">
                <p className="text-sm font-semibold text-sky-300">
                  A real Givio card
                </p>

                <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
                  <Image
                    src="/images/inside-right-base.png"
                    alt="Inside view of a Givio card showing a QR code and Congratulations message"
                    width={900}
                    height={600}
                    className="h-auto w-full"
                    priority
                  />
                </div>

                <p className="mt-4 text-sm leading-relaxed text-slate-100/80">
                  Every Givio card carries a single QR code. Givers use it to load
                  funds. Recipients scan the same code to claim and choose payout.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-white/10 bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
          <p className="mt-3 max-w-2xl text-slate-100/80">
            A simple flow designed for weddings, birthdays, graduations, and group
            gifts.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm font-semibold text-sky-300/80">1 · Gift</p>
              <h3 className="mt-2 text-sm font-semibold">Buy a Givio card</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-100/80">
                Pick up a Givio card from a partner shop or order a pack
                online.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm font-semibold text-sky-300/80">2 · Load</p>
              <h3 className="mt-2 text-sm font-semibold">Scan and load funds</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-100/80">
                Scan the QR code and choose how much you want to give. Payments
                are secure and tracked.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm font-semibold text-sky-300/80">3 · Claim</p>
              <h3 className="mt-2 text-sm font-semibold">Recipient chooses payout</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-100/80">
                The recipient scans the same QR code to claim and chooses a
                payout option.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Retail CTA */}
      <section className="border-t border-white/10 bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-10 rounded-[2rem] border border-white/10 bg-white/5 p-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Ready to put Givio Cards in the real world?
              </h2>
              <p className="mt-4 text-slate-100/80">
                We are rolling out physical Givio Cards with select shops. You
                can also order card packs online for events and gifting.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/shop"
                  className="rounded-2xl bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-sky-400 transition"
                >
                  Order Givio card packs
                </Link>

                <Link
                  href="/retail"
                  className="rounded-2xl bg-white/10 px-6 py-3 text-sm font-semibold hover:bg-white/15 transition"
                >
                  Become a retail partner
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-950/40 p-8">
              <h3 className="text-base font-semibold">Why shops like it</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-100/80">
                <li>Physical product customers can grab at checkout</li>
                <li>Perfect for last minute gifting</li>
                <li>Simple inventory and easy replenishment</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ preview */}
      <section className="border-t border-white/10 bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-bold tracking-tight">FAQ</h2>
          <p className="mt-3 max-w-2xl text-slate-100/80">
            Givio Cards are a new way to give and receive event gifts. Here are
            a few common questions.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-base font-semibold text-slate-50">
                Are Givio Cards safe to use
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-100/80">
                We use trusted payment providers and follow standard security
                practices. Card funds do not sit in your email inbox or live on
                Givio servers. We only store the info needed to complete a claim
                and payout.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-base font-semibold text-slate-50">
                What payout options are available
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-100/80">
                Givio Cards are expanding payout options over time. Currently we
                support common payout methods and will continue to add more based
                on demand.
              </p>
            </div>
          </div>

          <div className="mt-8">
            <Link
              href="/faq"
              className="inline-flex rounded-2xl bg-white/10 px-6 py-3 text-sm font-semibold hover:bg-white/15 transition"
            >
              View all FAQs
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-100/60">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Givio Cards. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="/terms" className="hover:text-slate-100">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-slate-100">
                Privacy
              </Link>
              <Link href="/contact" className="hover:text-slate-100">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
