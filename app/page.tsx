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

  const style: React.CSSProperties | undefined = prefersReducedMotion
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, t: number) {
  return start + (end - start) * t;
}

function FlippingCard({
  frontSrc,
  frontAlt,
  backContent,
  transform,
  opacity = 1,
  priority = false,
}: {
  frontSrc: string;
  frontAlt: string;
  backContent: ReactNode;
  transform: string;
  opacity?: number;
  priority?: boolean;
}) {
  return (
    <div
      className="group relative mx-auto aspect-[5/7] w-full max-w-[220px] [perspective:1600px]"
      style={{ transformStyle: "preserve-3d", opacity }}
    >
      <div
        className="relative h-full w-full rounded-[1.75rem] shadow-[0_18px_50px_rgba(14,116,144,0.18)] transition-transform duration-100 will-change-transform"
        style={{
          transform,
          transformStyle: "preserve-3d",
        }}
      >
        <div
          className="absolute inset-0 overflow-hidden rounded-[1.75rem] bg-white dark:bg-slate-950"
          style={{ backfaceVisibility: "hidden" }}
        >
          <Image
            src={frontSrc}
            alt={frontAlt}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 50vw, 25vw"
            priority={priority}
          />
        </div>

        <div
          className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-[1.75rem] bg-slate-50/95 p-5 dark:bg-slate-950/85"
          style={{
            transform: "rotateY(180deg)",
            backfaceVisibility: "hidden",
          }}
        >
          {backContent}
        </div>
      </div>
    </div>
  );
}

function StepBack({
  step,
  line1,
  line2,
}: {
  step: string;
  line1: string;
  line2: string;
}) {
  return (
    <div className="space-y-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
        {step}
      </p>
      <p className="text-xl font-semibold leading-tight text-slate-950 dark:text-slate-50 sm:text-2xl">
        {line1}
      </p>
      <p className="text-xl font-semibold leading-tight text-slate-950 dark:text-slate-50 sm:text-2xl">
        {line2}
      </p>
    </div>
  );
}

function ScrollHowItWorksSection() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const wrapperRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion) {
      setProgress(1);
      return;
    }

    let rafId = 0;

    const update = () => {
      const el = wrapperRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const total = Math.max(el.offsetHeight - window.innerHeight, 1);
      const travelled = clamp(-rect.top, 0, total);
      const next = clamp(travelled / total, 0, 1);

      setProgress((prev) => {
        if (Math.abs(prev - next) < 0.001) return prev;
        return next;
      });
    };

    const requestTick = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(update);
    };

    update();

    window.addEventListener("scroll", requestTick, { passive: true });
    window.addEventListener("resize", requestTick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", requestTick);
      window.removeEventListener("resize", requestTick);
    };
  }, [prefersReducedMotion]);

  const card1Slide = clamp(progress / 0.22, 0, 1);
  const card2Slide = clamp((progress - 0.04) / 0.22, 0, 1);
  const card3Slide = clamp((progress - 0.08) / 0.22, 0, 1);
  const card4Slide = clamp((progress - 0.12) / 0.22, 0, 1);

  const card1Flip = clamp((progress - 0.24) / 0.12, 0, 1);
  const card2Flip = clamp((progress - 0.34) / 0.12, 0, 1);
  const card3Flip = clamp((progress - 0.44) / 0.12, 0, 1);
  const card4Flip = clamp((progress - 0.54) / 0.12, 0, 1);

  const cardTransform = (slideT: number, flipT: number) =>
    prefersReducedMotion
      ? "translate3d(0,0,0) rotateY(180deg)"
      : `translate3d(${lerp(115, 0, slideT)}%, 0, 0) rotateY(${lerp(0, 180, flipT)}deg)`;

  return (
    <section
      id="how-it-works"
      ref={wrapperRef}
      className="relative h-[235vh] scroll-mt-44 sm:h-[245vh] lg:h-[255vh]"
    >
      <div className="sticky top-24 flex min-h-[calc(100vh-7rem)] items-center overflow-visible py-6 sm:py-8">
        <div className="w-full space-y-6 sm:space-y-8">
          <Reveal className="space-y-3 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-300 sm:text-base md:text-lg">
              How it works
            </p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              One real card, three simple steps
            </h2>
          </Reveal>

          <div className="relative mx-auto max-w-6xl">
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-40 -translate-y-1/2 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-500/10" />

            <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
              <FlippingCard
                frontSrc="/Homepage_Display_Card/Homepage_display_Card.png"
                frontAlt="Givio floral wedding card cover"
                backContent={
                  <div className="relative h-full w-full">
                    <Image
                      src="/Homepage_Display_Card/Inside_cover.png"
                      alt="Inside of a Givio card showing the QR code"
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      priority
                    />
                  </div>
                }
                transform={cardTransform(card1Slide, card1Flip)}
                priority
              />

              <FlippingCard
                frontSrc="/Homepage_Display_Card/Homepage_display_Card_2.png"
                frontAlt="Givio birthday card cover"
                backContent={
                  <StepBack
                    step="Step 1"
                    line1="Scan the QR"
                    line2="Load your gift"
                  />
                }
                transform={cardTransform(card2Slide, card2Flip)}
                priority
              />

              <FlippingCard
                frontSrc="/Homepage_Display_Card/Homepage_display_Card_3.png"
                frontAlt="Givio graduation card cover"
                backContent={
                  <StepBack
                    step="Step 2"
                    line1="Give your"
                    line2="Givio card"
                  />
                }
                transform={cardTransform(card3Slide, card3Flip)}
                priority
              />

              <FlippingCard
                frontSrc="/Homepage_Display_Card/Homepage_display_Card_4.png"
                frontAlt="Givio travel themed card cover"
                backContent={
                  <StepBack
                    step="Step 3"
                    line1="Recipient scans"
                    line2="to claim funds"
                  />
                }
                transform={cardTransform(card4Slide, card4Flip)}
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
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
                Givio Cards turn a simple card into a QR powered gift. Guests
                scan a card, load a monetary gift through Stripe, and the
                recipient scans the same card to claim their funds later.
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
                Recipients keep the gift amount. Guests cover a small service
                fee. Payments are handled securely by Stripe.
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

          <ScrollHowItWorksSection />

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
                    We are rolling out physical Givio Cards with select shops.
                    You can order card packs online today.
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
                Givio Cards are a new way to give and receive event gifts. Here
                are clear answers to the most common questions we hear.
              </p>
            </Reveal>

            <RevealStagger className="grid gap-5 md:grid-cols-2" baseDelayMs={80}>
              <div className="rounded-3xl border border-sky-100/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-sky-800/70 dark:bg-slate-950/80">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  Are Givio Cards safe to use
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-900/80 dark:text-slate-100/80">
                  Payments are processed by Stripe. Card details never pass
                  through or live on Givio servers. We only store the info
                  needed to link each card to its gift and payout.
                </p>
              </div>

              <div className="rounded-3xl border border-sky-100/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-sky-800/70 dark:bg-slate-950/80">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  What fees apply and who pays them
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-900/80 dark:text-slate-100/80">
                  Guests pay for the physical card and a small service fee when
                  they send a gift. Recipients keep the full gift amount if
                  using a free transfer method.
                </p>
              </div>

              <div className="rounded-3xl border border-sky-100/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-sky-800/70 dark:bg-slate-950/80">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  What if someone loses the card
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-900/80 dark:text-slate-100/80">
                  The QR code on the physical card is the key to the gift. We
                  recommend recipients keep cards in a safe place once they are
                  opened. If a card is lost before a payout, contact us.
                </p>
              </div>

              <div className="rounded-3xl border border-sky-100/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-sky-800/70 dark:bg-slate-950/80">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  How long can gifts remain unclaimed
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-900/80 dark:text-slate-100/80">
                  Funds stay linked to the card until a payout request is made
                  or a year after the card is loaded, submitted, and processed.
                </p>
              </div>

              <div className="rounded-3xl border border-sky-100/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-sky-800/70 dark:bg-slate-950/80">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  Do recipients need an app or account
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-900/80 dark:text-slate-100/80">
                  No app is required. Recipients scan the QR code printed inside
                  the card and submit a payout request through a mobile friendly
                  page.
                </p>
              </div>

              <div className="rounded-3xl border border-sky-100/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-sky-800/70 dark:bg-slate-950/80">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  Which payout methods are supported
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-900/80 dark:text-slate-100/80">
                  We support Venmo payouts and bank transfers. Our goal is to
                  give recipients familiar ways to move gift money where they
                  want it.
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