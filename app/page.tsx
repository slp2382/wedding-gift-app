// app/page.tsx

"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import EmailCaptureModal from "./components/EmailCaptureModal";
import ReviewsSection from "./components/ReviewsSection";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(!!mq.matches);

    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return reduced;
}

function Reveal({
  children,
  className = "",
  delayMs = 0,
  y = 18,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  y?: number;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion) {
      setShown(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.16, rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  const style: React.CSSProperties = prefersReducedMotion
    ? undefined
    : {
        transitionDelay: `${delayMs}ms`,
        transform: shown ? "translate3d(0,0,0)" : `translate3d(0,${y}px,0)`,
        opacity: shown ? 1 : 0,
      };

  return (
    <div
      ref={ref}
      style={style}
      className={[
        className,
        prefersReducedMotion
          ? ""
          : "transition-[transform,opacity] duration-700 ease-out will-change-[transform,opacity]",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function RevealStagger({
  children,
  className = "",
  baseDelayMs = 0,
  stepMs = 90,
}: {
  children: ReactNode;
  className?: string;
  baseDelayMs?: number;
  stepMs?: number;
}) {
  const items = useMemo(() => {
    const arr = Array.isArray(children) ? children : [children];
    return arr.filter(Boolean) as ReactNode[];
  }, [children]);

  return (
    <div className={className}>
      {items.map((child, idx) => (
        <Reveal key={idx} delayMs={baseDelayMs + idx * stepMs}>
          {child}
        </Reveal>
      ))}
    </div>
  );
}

export default function HomePage() {
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const threshold = 8;

    const onScroll = () => {
      const currentY = window.scrollY;

      if (currentY <= 2) {
        setShowHeader(true);
        lastScrollYRef.current = currentY;
        return;
      }

      const delta = currentY - lastScrollYRef.current;

      if (Math.abs(delta) < threshold) return;

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

      <header
        className={[
          "fixed left-0 right-0 top-0 z-50",
          "border-b border-sky-100/80 bg-sky-50/70 backdrop-blur",
          "dark:border-sky-800/70 dark:bg-slate-950/60",
          "transition-transform duration-300 ease-out",
          showHeader ? "translate-y-0" : "-translate-y-full",
        ].join(" ")}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:py-5">
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

          <div className="flex items-center gap-4">
            <nav className="hidden items-center gap-7 md:flex">
              <a
                href="#how-it-works"
                className="text-sm font-medium text-slate-900/80 transition hover:text-slate-950 dark:text-slate-100/80 dark:hover:text-slate-50"
              >
                How it works
              </a>

              <Link
                href="/locations"
                className="text-sm font-medium text-slate-900/80 transition hover:text-slate-950 dark:text-slate-100/80 dark:hover:text-slate-50"
              >
                Retail Locations
              </Link>

              <a
                href="#faq"
                className="text-sm font-medium text-slate-900/80 transition hover:text-slate-950 dark:text-slate-100/80 dark:hover:text-slate-50"
              >
                FAQ
              </a>
            </nav>

            <Link
              href="/shop"
              className="inline-flex items-center justify-center rounded-full bg-sky-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-600 focus-visible:outline-none focus-visible:ring focus-visible:ring-sky-500/60 dark:bg-sky-500 dark:hover:bg-sky-400"
            >
              Shop
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-10 pt-36 sm:pt-40">
        <main className="space-y-28 pb-16 sm:space-y-32">
          <section className="grid gap-12 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-center">
            <Reveal className="space-y-6">
              <div className="inline-flex items-center gap-2 self-start rounded-full border border-sky-200/80 bg-sky-50/80 px-3 py-1 text-xs font-semibold text-sky-700 shadow-sm backdrop-blur dark:border-sky-500/50 dark:bg-sky-950/60 dark:text-sky-200">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-sky-500" />
                <span>Cashless wedding and birthday gifts</span>
              </div>

              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl md:leading-[1.05]">
                Physical event cards with{" "}
                <span className="bg-gradient-to-r from-sky-700 via-sky-500 to-sky-300 bg-clip-text text-transparent">
                  scannable gift links
                </span>
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-slate-900/80 dark:text-slate-100/80">
                Givio Cards turn a simple card into a QR powered gift. Guests scan a
                card, load a monetary gift through Stripe, and the recipient scans
                the same card to claim their funds later.
              </p>

              <div className="flex flex-wrap gap-3">
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center rounded-full bg-sky-700 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-sky-600 focus-visible:outline-none focus-visible:ring focus-visible:ring-sky-500/60 dark:bg-sky-500 dark:hover:bg-sky-400"
                >
                  How Givio Cards work
                </a>

                <Link
                  href="/shop"
                  className="inline-flex items-center justify-center rounded-full border border-sky-200/80 bg-sky-50/80 px-5 py-3 text-sm font-medium text-slate-950 shadow-sm transition hover:bg-sky-100 focus-visible:outline-none focus-visible:ring focus-visible:ring-sky-500/40 dark:border-sky-700 dark:bg-sky-950/70 dark:text-slate-50 dark:hover:bg-sky-950"
                >
                  Shop
                </Link>
              </div>

              <p className="text-xs text-slate-900/70 dark:text-slate-200/80">
                Recipients keep the gift amount. Guests cover a small service fee.
                Payments are handled securely by Stripe.
              </p>
            </Reveal>

            <Reveal delayMs={120} className="relative">
              <div className="pointer-events-none absolute -inset-8 rounded-3xl bg-gradient-to-br from-sky-500/12 via-sky-400/12 to-sky-300/12 blur-2xl dark:from-sky-500/16 dark:via-sky-400/16 dark:to-sky-300/16" />

              <div className="group relative overflow-hidden rounded-3xl border border-sky-200/80 bg-slate-50/95 p-5 shadow-xl shadow-sky-100/70 backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-sky-100/80 dark:border-sky-700/70 dark:bg-slate-950/90 dark:shadow-none">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
                      A real Givio card
                    </p>
                    <p className="mt-2 text-sm text-slate-900/80 dark:text-slate-100/80">
                      Unique QR inside every card
                    </p>
                  </div>

                  <div className="rounded-full border border-sky-200/80 bg-sky-50/80 px-3 py-1 text-[11px] font-semibold text-sky-800 shadow-sm dark:border-sky-700/70 dark:bg-sky-950/60 dark:text-sky-200">
                    Printed and ready
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-sky-100 bg-slate-50 shadow-sm transition group-hover:shadow-md dark:border-sky-800 dark:bg-slate-950">
                  <Image
                    src="/Example_Card.png"
                    alt="Inside view of a Givio card showing a QR code and message"
                    width={900}
                    height={900}
                    className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.015]"
                    priority
                  />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-sky-100/80 bg-white/70 p-3 text-xs text-slate-900/80 shadow-sm dark:border-sky-800/70 dark:bg-slate-950/60 dark:text-slate-100/80">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700/80 dark:text-sky-300/80">
                      Giver
                    </p>
                    <p className="mt-1">
                      Scan, add name and note, choose amount, pay securely.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-sky-100/80 bg-white/70 p-3 text-xs text-slate-900/80 shadow-sm dark:border-sky-800/70 dark:bg-slate-950/60 dark:text-slate-100/80">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700/80 dark:text-sky-300/80">
                      Recipient
                    </p>
                    <p className="mt-1">
                      Scan the same QR to claim via Venmo or bank payout.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-[11px] text-slate-900/70 dark:text-slate-200/80">
                  <p>Mobile friendly checkout and claim flow</p>
                  <Link
                    href="/shop"
                    className="font-semibold text-sky-800 transition hover:text-sky-700 dark:text-sky-200 dark:hover:text-sky-100"
                  >
                    View designs
                  </Link>
                </div>
              </div>
            </Reveal>
          </section>

          <section id="how-it-works" className="scroll-mt-44 space-y-8">
            <Reveal className="space-y-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
                How it works
              </p>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Three simple steps, one QR code
              </h2>
              <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-900/80 dark:text-slate-100/80">
                Every Givio card carries a single QR code. Givers use it to load
                gifts, and recipients use the same code to claim them later.
              </p>
            </Reveal>

            <RevealStagger className="grid gap-5 md:grid-cols-3" baseDelayMs={60}>
              <div className="group rounded-3xl border border-sky-100/80 bg-slate-50/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-sky-800/70 dark:bg-slate-950/80">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700/80 dark:text-sky-300/80">
                  Step 1
                </p>
                <h3 className="text-base font-semibold">Buy a Givio card</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-900/80 dark:text-slate-100/80">
                  Pick up a card from a partner shop or order a pack online. Each one
                  includes a unique QR code.
                </p>
                <div className="mt-4 h-px w-full bg-gradient-to-r from-sky-200 via-sky-100 to-transparent dark:from-sky-800 dark:via-sky-900" />
                <p className="mt-3 text-xs text-slate-900/70 dark:text-slate-200/80">
                  Great for weddings, birthdays, and showers.
                </p>
              </div>

              <div className="group rounded-3xl border border-sky-100/80 bg-slate-50/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-sky-800/70 dark:bg-slate-950/80">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700/80 dark:text-sky-300/80">
                  Step 2
                </p>
                <h3 className="text-base font-semibold">Scan to load your gift</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-900/80 dark:text-slate-100/80">
                  Givers scan the QR, enter their name and note, choose an amount,
                  and pay through Stripe.
                </p>
                <div className="mt-4 h-px w-full bg-gradient-to-r from-sky-200 via-sky-100 to-transparent dark:from-sky-800 dark:via-sky-900" />
                <p className="mt-3 text-xs text-slate-900/70 dark:text-slate-200/80">
                  No cash, no awkward envelopes.
                </p>
              </div>

              <div className="group rounded-3xl border border-sky-100/80 bg-slate-50/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-sky-800/70 dark:bg-slate-950/80">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700/80 dark:text-sky-300/80">
                  Step 3
                </p>
                <h3 className="text-base font-semibold">Recipient scans to claim</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-900/80 dark:text-slate-100/80">
                  The recipient scans that same QR code later to claim the funds and
                  deposit them.
                </p>
                <div className="mt-4 h-px w-full bg-gradient-to-r from-sky-200 via-sky-100 to-transparent dark:from-sky-800 dark:via-sky-900" />
                <p className="mt-3 text-xs text-slate-900/70 dark:text-slate-200/80">
                  Familiar payout methods, clear status updates.
                </p>
              </div>
            </RevealStagger>
          </section>

          <Reveal>
            <section className="space-y-5 rounded-3xl border border-sky-100/80 bg-slate-50/95 p-7 shadow-lg shadow-sky-100/70 dark:border-sky-800 dark:bg-slate-950/85 dark:shadow-none">
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
                    For recipients and shops
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Ready to put Givio Cards in the real world
                  </h2>
                  <p className="max-w-2xl text-base leading-relaxed text-slate-900/80 dark:text-slate-100/80">
                    We are rolling out physical Givio Cards with select shops. You can
                    order card packs online today.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/shop"
                    className="inline-flex items-center justify-center rounded-full bg-sky-700 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-sky-600 focus-visible:outline-none focus-visible:ring focus-visible:ring-sky-500/60 dark:bg-sky-500 dark:hover:bg-sky-400"
                  >
                    Order card packs
                  </Link>

                  <Link
                    href="/locations"
                    className="inline-flex items-center justify-center rounded-full border border-sky-200/80 bg-sky-50/80 px-5 py-3 text-sm font-medium text-slate-950 shadow-sm transition hover:bg-sky-100 focus-visible:outline-none focus-visible:ring focus-visible:ring-sky-500/40 dark:border-sky-700 dark:bg-sky-950/70 dark:text-slate-50 dark:hover:bg-sky-950"
                  >
                    Find retail locations
                  </Link>
                </div>
              </div>
            </section>
          </Reveal>

          <section
            id="faq"
            className="scroll-mt-32 space-y-8 rounded-3xl border border-sky-100/80 bg-slate-50/95 p-7 shadow-sm dark:border-sky-800 dark:bg-slate-950/85"
          >
            <Reveal className="space-y-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
                Frequently asked questions
              </p>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Answers for recipients and gifters
              </h2>
              <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-900/80 dark:text-slate-100/80">
                Givio Cards are a new way to give and receive event gifts. Here are
                clear answers to the most common questions we hear.
              </p>
            </Reveal>

            <RevealStagger className="grid gap-5 md:grid-cols-2" baseDelayMs={80}>
              <div className="rounded-3xl border border-sky-100/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-sky-800/70 dark:bg-slate-950/80">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  Are Givio Cards safe to use
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-900/80 dark:text-slate-100/80">
                  Payments are processed by Stripe. Card details never pass through or
                  live on Givio servers. We only store the info needed to link each card
                  to its gift and payout.
                </p>
              </div>

              <div className="rounded-3xl border border-sky-100/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-sky-800/70 dark:bg-slate-950/80">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  What fees apply and who pays them
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-900/80 dark:text-slate-100/80">
                  Guests pay for the physical card and a small service fee when they send a
                  gift. Recipients keep the full gift amount if using a free transfer method.
                </p>
              </div>

              <div className="rounded-3xl border border-sky-100/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-sky-800/70 dark:bg-slate-950/80">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  What if someone loses the card
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-900/80 dark:text-slate-100/80">
                  The QR code on the physical card is the key to the gift. We recommend
                  recipients keep cards in a safe place once they are opened. If a card is
                  lost before a payout, contact us.
                </p>
              </div>

              <div className="rounded-3xl border border-sky-100/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-sky-800/70 dark:bg-slate-950/80">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  How long can gifts remain unclaimed
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-900/80 dark:text-slate-100/80">
                  Funds stay linked to the card until a payout request is made or a year
                  after the card is loaded, submitted, and processed.
                </p>
              </div>

              <div className="rounded-3xl border border-sky-100/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-sky-800/70 dark:bg-slate-950/80">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  Do recipients need an app or account
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-900/80 dark:text-slate-100/80">
                  No app is required. Recipients scan the QR code printed inside the card
                  and submit a payout request through a mobile friendly page.
                </p>
              </div>

              <div className="rounded-3xl border border-sky-100/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-sky-800/70 dark:bg-slate-950/80">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  Which payout methods are supported
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-900/80 dark:text-slate-100/80">
                  We support Venmo payouts and bank transfers. Our goal is to give recipients
                  familiar ways to move gift money where they want it.
                </p>
              </div>
            </RevealStagger>
          </section>

          <Reveal>
            <section className="pt-2">
              <ReviewsSection />
            </section>
          </Reveal>
        </main>

        <footer className="mt-8 border-t border-sky-100/80 pt-5 text-xs text-slate-800/80 dark:border-sky-800 dark:text-slate-200/80">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>© {new Date().getFullYear()} Givio Cards. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="/terms" className="transition hover:underline">
                Terms
              </Link>
              <Link href="/privacy" className="transition hover:underline">
                Privacy
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}