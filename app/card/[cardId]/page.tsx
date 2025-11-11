"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabaseClient";

type CardRecord = {
  card_id: string;
  giver_name: string | null;
  amount: number | null;
  note: string | null;
  claimed: boolean;
  created_at: string;
};

export default function CardPage() {
  const params = useParams<{ cardId: string }>();
  const cardId = params.cardId;

  const [card, setCard] = useState<CardRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Guest load form state (for blank store cards)
  const [guestName, setGuestName] = useState("");
  const [guestAmount, setGuestAmount] = useState("");
  const [guestNote, setGuestNote] = useState("");
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);

  // Claim funds / payout request state
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [payoutName, setPayoutName] = useState("");
  const [payoutEmail, setPayoutEmail] = useState("");
  // For now, we only support Venmo as a payout method
  const [payoutMethod] = useState("venmo");
  const [payoutDetails, setPayoutDetails] = useState("");
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);

  // Flip animation state
  const [flipKey, setFlipKey] = useState(0);
  const prevFundedRef = useRef(false);
  const prevClaimedRef = useRef(false);

  // Intro envelope animation state
  const [introDone, setIntroDone] = useState(true);
  const [hasPlayedIntro, setHasPlayedIntro] = useState(false);

  // Load card details from Supabase
  useEffect(() => {
    if (!cardId) {
      setErrorMessage("No card id was provided.");
      setLoading(false);
      return;
    }

    async function fetchCard() {
      setLoading(true);
      setErrorMessage(null);

      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("card_id", cardId)
        .single();

      if (error) {
        console.error("Supabase select error:", error);
        setErrorMessage(
          error.message || "Card not found or something went wrong.",
        );
        setCard(null);
      } else {
        setCard(data as CardRecord);
      }

      setLoading(false);
    }

    fetchCard();
  }, [cardId]);

  // Derived status flags
  const amount = card && card.amount != null ? Number(card.amount) : 0;

  const isBlankStoreCard = !!card && amount <= 0 && !card.claimed;
  const isFunded = !!card && amount > 0 && !card.claimed;
  const isClaimed = !!card && card.claimed;

  // Venmo-only payout field text
  const detailLabel = "Venmo handle";
  const detailPlaceholder = "@your-venmo-handle";
  const detailHelpText =
    "We’ll use this Venmo handle to send your gift. Make sure it matches your Venmo profile exactly.";

  // Trigger flip when card transitions to funded or claimed
  useEffect(() => {
    const prevFunded = prevFundedRef.current;
    const prevClaimed = prevClaimedRef.current;

    if ((!prevFunded && isFunded) || (!prevClaimed && isClaimed)) {
      setFlipKey((k) => k + 1);
    }

    prevFundedRef.current = isFunded;
    prevClaimedRef.current = isClaimed;
  }, [isFunded, isClaimed]);

  // Trigger envelope intro animation once for funded, unclaimed cards
  useEffect(() => {
    if (!loading && card && isFunded && !isClaimed && !hasPlayedIntro) {
      setIntroDone(false);
      setHasPlayedIntro(true);
      const t = setTimeout(() => {
        setIntroDone(true);
      }, 2600); // total intro duration
      return () => clearTimeout(t);
    }

    // For all other states (not funded or claimed), content is just shown
    if (!loading && (!isFunded || isClaimed)) {
      setIntroDone(true);
    }
  }, [loading, card, isFunded, isClaimed, hasPlayedIntro]);

  // Guest load handler for blank store cards (Stripe Checkout)
  async function handleGuestLoad(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!card || !cardId) return;

    if (!isBlankStoreCard) {
      setGuestError("This card is not in a loadable state.");
      return;
    }

    const trimmedName = guestName.trim();
    const amountNumber = Number(guestAmount);

    if (!trimmedName) {
      setGuestError("Please enter your name.");
      return;
    }

    if (!amountNumber || amountNumber <= 0) {
      setGuestError("Enter an amount greater than zero.");
      return;
    }

    setGuestError(null);
    setLoadingCheckout(true);

    try {
      const response = await fetch("/api/load-gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId,
          giverName: trimmedName,
          amount: amountNumber,
          note: guestNote.trim() || null,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        const message =
          (result && result.error) ||
          "Could not start checkout. Please try again.";
        setGuestError(message);
        setLoadingCheckout(false);
        return;
      }

      const result = await response.json();
      const redirectUrl = result.url || result.checkoutUrl;

      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        setGuestError(
          "Checkout link was not returned. Please try again.",
        );
        setLoadingCheckout(false);
      }
    } catch (err) {
      console.error("Error starting Stripe checkout:", err);
      setGuestError(
        "Something went wrong while starting secure checkout.",
      );
      setLoadingCheckout(false);
    }
  }

  // Handle submitting payout info + marking card as claimed
  async function handleSubmitPayout(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!card || !cardId) return;
    if (!isFunded || isClaimed) return;

    const name = payoutName.trim();
    const email = payoutEmail.trim();
    const details = payoutDetails.trim();

    if (!name) {
      setPayoutError("Please enter your name.");
      return;
    }

    if (!email) {
      setPayoutError(
        "Please enter your email so we can contact you about the payout.",
      );
      return;
    }

    if (!details) {
      setPayoutError("Please enter your Venmo handle.");
      return;
    }

    setPayoutError(null);
    setPayoutSuccess(null);
    setPayoutLoading(true);

    try {
      // 1) Save payout request
      const res = await fetch("/api/request-payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId,
          contactName: name,
          contactEmail: email,
          payoutMethod, // will be "venmo"
          payoutDetails: details,
        }),
      });

      if (!res.ok) {
        const result = await res.json().catch(() => null);
        const message =
          (result && result.error) ||
          "Could not submit payout request. Please try again.";
        setPayoutError(message);
        setPayoutLoading(false);
        return;
      }

      // 2) Mark card as claimed
      const claimRes = await fetch("/api/claim-gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId }),
      });

      if (!claimRes.ok) {
        const result = await claimRes.json().catch(() => null);
        const message =
          (result && result.error) ||
          "We saved your payout request, but could not mark this card as claimed.";
        setPayoutError(message);
        setPayoutLoading(false);
        return;
      }

      const claimResult = await claimRes.json();
      if (claimResult && claimResult.card) {
        setCard(claimResult.card as CardRecord);
      }

      setPayoutSuccess(
        "Thanks! We’ve received your Venmo details. We’ll review and send your gift to that handle soon.",
      );
      setShowClaimForm(false);
    } catch (err) {
      console.error("Error submitting payout request:", err);
      setPayoutError(
        "Something went wrong while submitting your payout request.",
      );
    }

    setPayoutLoading(false);
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-sky-50 via-indigo-50/60 to-zinc-50 px-4 py-6 text-zinc-900 dark:from-zinc-950 dark:via-slate-950 dark:to-zinc-950 dark:text-zinc-50">
      {/* Envelope intro animation overlay */}
      <AnimatePresence>
        {!introDone && isFunded && !isClaimed && (
          <motion.div
            className="fixed inset-0 z-30 flex items-end justify-center bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 pb-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              initial={{ y: 160, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="relative h-48 w-72"
              style={{ perspective: 900 }}
            >
              {/* Envelope body */}
              <div className="absolute inset-x-4 bottom-0 h-28 rounded-xl border border-emerald-700 bg-emerald-900 shadow-xl shadow-black/40" />

              {/* Card sliding up (cream like favicon) */}
              <motion.div
                initial={{ y: 36, opacity: 0 }}
                animate={{ y: -22, opacity: 1 }}
                transition={{ delay: 0.55, duration: 0.55, ease: "easeOut" }}
                className="absolute inset-x-6 bottom-10 rounded-2xl border border-emerald-700/60 bg-[#f5f0e3] px-4 py-3 shadow-lg shadow-emerald-950/70"
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold tracking-tight text-emerald-900">
                    GL
                  </span>
                  <span className="h-8 w-8 rounded-sm bg-emerald-900/90" />
                </div>
                <p className="mt-3 text-[11px] font-medium text-emerald-800">
                  Open this card to claim the funds waiting on your GiftLink.
                </p>
              </motion.div>

              {/* Envelope flap opening over card */}
              <motion.div
                initial={{ rotateX: 0 }}
                animate={{ rotateX: -135 }}
                transition={{ delay: 0.25, duration: 0.5, ease: "easeInOut" }}
                style={{
                  transformOrigin: "bottom center",
                  transformStyle: "preserve-3d",
                }}
                className="absolute inset-x-4 bottom-[4.6rem] h-10"
              >
                <div className="h-full w-full rounded-t-xl border border-emerald-700 bg-emerald-950" />
              </motion.div>

              {/* Logo seal on envelope front */}
              <div className="absolute left-1/2 bottom-6 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-emerald-600 bg-emerald-900 text-xs font-semibold tracking-tight text-emerald-50">
                GL
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto flex min-h-[90vh] max-w-3xl flex-col">
        {/* Top nav / wordmark */}
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-400 to-emerald-400 shadow-md shadow-indigo-500/30 dark:shadow-indigo-700/40">
              <span className="text-lg font-semibold text-white">G</span>
            </div>
          <div className="leading-tight">
              <p className="text-lg font-semibold tracking-tight">GiftLink</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Wedding gift QR cards
              </p>
            </div>
          </div>

          <div className="hidden text-xs font-medium text-zinc-500 dark:text-zinc-400 md:block">
            <span className="rounded-full border border-zinc-200/80 bg-white/60 px-3 py-1 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60">
              Guest view · Card scan
            </span>
          </div>
        </header>

        <motion.main
          className="flex-1 space-y-6"
          initial={false}
          animate={introDone ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {/* Hero / heading */}
          <section className="space-y-3 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-500 dark:text-indigo-300">
              Wedding Gift Card
            </p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              A gift for the happy couple
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Card ID{" "}
              <span className="font-mono text-[11px] text-zinc-600 dark:text-zinc-300">
                {cardId || "(missing)"}
              </span>
            </p>

            {/* Decorative line */}
            <div className="mt-3 flex items-center justify-center gap-3">
              <div className="h-px w-16 bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400" />
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                Couple view
              </p>
              <div className="h-px w-16 bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400" />
            </div>
          </section>

          {/* Loading state */}
          {loading && (
            <section className="mt-4 rounded-2xl border border-zinc-200/80 bg-white/80 p-6 text-center shadow-lg shadow-indigo-100/60 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-none">
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Loading card details…
              </p>
            </section>
          )}

          {/* Error / not found */}
          {!loading && errorMessage && !card && (
            <section className="mt-4 rounded-2xl border border-rose-200/80 bg-rose-50/80 p-6 text-center shadow-md shadow-rose-100/60 backdrop-blur-sm dark:border-rose-900 dark:bg-rose-950/40 dark:shadow-none">
              <p className="text-sm font-medium text-rose-700 dark:text-rose-200">
                {errorMessage}
              </p>
              <p className="mt-2 text-xs text-rose-700/80 dark:text-rose-300/80">
                Try scanning a different QR or creating a fresh card from the
                homepage.
              </p>
            </section>
          )}

          {/* Card content */}
          {!loading && card && (
            <motion.section
              key={flipKey}
              initial={{ rotateY: 180, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className={`mt-4 transform-gpu rounded-2xl border p-6 shadow-lg backdrop-blur-sm ${
                isClaimed
                  ? "border-emerald-400/80 bg-emerald-50/80 shadow-emerald-100/70 dark:border-emerald-500 dark:bg-emerald-950/40 dark:shadow-none"
                  : isFunded
                  ? "border-indigo-300/80 bg-white/80 shadow-indigo-100/70 dark:border-indigo-400/70 dark:bg-zinc-900/80 dark:shadow-none"
                  : "border-amber-200/80 bg-amber-50/80 shadow-amber-100/60 dark:border-amber-500/70 dark:bg-amber-950/40 dark:shadow-none"
              }`}
            >
              <div className="space-y-4">
                {/* Status pill */}
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="inline-flex items-center gap-2 rounded-full px-3 py-1">
                    {isClaimed ? (
                      <>
                        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.25)]" />
                        <span className="font-medium text-emerald-800 dark:text-emerald-200">
                          Gift claimed
                        </span>
                      </>
                    ) : isFunded ? (
                      <>
                        <span className="inline-flex h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_0_4px_rgba(79,70,229,0.25)]" />
                        <span className="font-medium text-indigo-800 dark:text-indigo-200">
                          Gift ready to claim
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="inline-flex h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_0_4px_rgba(251,191,36,0.3)]" />
                        <span className="font-medium text-amber-900 dark:text-amber-100">
                          {isBlankStoreCard
                            ? "Store card ready for a gift"
                            : "Not funded yet"}
                        </span>
                      </>
                    )}
                  </div>

                  {!isFunded && !isClaimed && (
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-100/80">
                      {isBlankStoreCard
                        ? "This card has been printed and activated, but no gift has been loaded yet."
                        : "Once a guest loads this card, it will appear here."}
                    </p>
                  )}

                  {isFunded && !isClaimed && (
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-300">
                      This gift has been funded and is waiting to be claimed.
                    </p>
                  )}

                  {isClaimed && (
                    <p className="text-[11px] text-emerald-700/80 dark:text-emerald-200/80">
                      Status saved — this card is fully received.
                    </p>
                  )}
                </div>

                {/* Giver and amount */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      From
                    </p>
                    <p className="text-lg font-semibold">
                      {card.giver_name ||
                        (isFunded
                          ? "A generous guest"
                          : "Waiting for a guest to load")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Amount
                    </p>
                    <p className="text-2xl font-bold tracking-tight">
                      {card.amount != null && Number(card.amount) > 0
                        ? Number(card.amount).toLocaleString("en-US", {
                            style: "currency",
                            currency: "USD",
                          })
                        : "—"}
                    </p>
                  </div>
                </div>

                {/* Note */}
                {card.note && (
                  <div className="mt-2 rounded-xl bg-sky-50/80 p-3 text-sm text-zinc-700 shadow-sm shadow-sky-100/60 dark:bg-zinc-900/70 dark:text-zinc-100 dark:shadow-none">
                    “{card.note}”
                  </div>
                )}

                {/* Status + actions */}
                <div className="space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                  {isClaimed ? (
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.25)]" />
                        <span className="font-medium text-emerald-700 dark:text-emerald-300">
                          Gift claimed
                        </span>
                      </div>
                      <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                        Saved to this card — you&apos;re all set.
                      </p>
                    </div>
                  ) : isFunded ? (
                    <>
                      <p className="text-sm text-zinc-600 dark:text-zinc-300">
                        When you claim this gift, we&apos;ll use your Venmo
                        details to send the funds to you outside the app.
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          setShowClaimForm((v) => !v)
                        }
                        className="inline-flex w-full items-center justify-center rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring focus-visible:ring-indigo-500/60 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                      >
                        {showClaimForm
                          ? "Hide claim form"
                          : "Claim gift via Venmo"}
                      </button>

                      {payoutSuccess && (
                        <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
                          {payoutSuccess}
                        </p>
                      )}

                      {showClaimForm && (
                        <div className="mt-3 rounded-xl bg-zinc-50/80 p-3 text-xs text-zinc-700 shadow-sm dark:bg-zinc-900/80 dark:text-zinc-100">
                          <p className="mb-2 text-sm font-medium">
                            Where should we send this gift?
                          </p>
                          <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                            For now, we send payouts via Venmo. Enter your name,
                            email, and Venmo handle and we&apos;ll review and
                            send your gift there shortly.
                          </p>

                          <form
                            onSubmit={handleSubmitPayout}
                            className="space-y-3"
                          >
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                                  Your name
                                </label>
                                <input
                                  type="text"
                                  value={payoutName}
                                  onChange={(e) =>
                                    setPayoutName(e.target.value)
                                  }
                                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                                  placeholder="Name for payout"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                                  Email for payout confirmation
                                </label>
                                <input
                                  type="email"
                                  value={payoutEmail}
                                  onChange={(e) =>
                                    setPayoutEmail(e.target.value)
                                  }
                                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                                  placeholder="you@example.com"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                                {detailLabel}
                              </label>
                              <input
                                type="text"
                                value={payoutDetails}
                                onChange={(e) =>
                                  setPayoutDetails(e.target.value)
                                }
                                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                                placeholder={detailPlaceholder}
                              />
                              <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                                {detailHelpText}
                              </p>
                            </div>

                            {payoutError && (
                              <p className="text-xs text-rose-600 dark:text-rose-400">
                                {payoutError}
                              </p>
                            )}

                            <button
                              type="submit"
                              disabled={payoutLoading}
                              className="inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring focus-visible:ring-emerald-500/60 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                            >
                              {payoutLoading
                                ? "Sending claim…"
                                : "Submit Venmo details"}
                            </button>
                          </form>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {isBlankStoreCard ? (
                        <>
                          <p className="text-sm text-amber-900 dark:text-amber-100">
                            This GiftLink card is ready for a guest to load.
                            When someone uses this QR link to send a gift,
                            the amount and their name will appear here for
                            the couple to claim.
                          </p>

                          <form
                            onSubmit={handleGuestLoad}
                            className="mt-3 space-y-3"
                          >
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                                  Your name
                                </label>
                                <input
                                  type="text"
                                  value={guestName}
                                  onChange={(e) =>
                                    setGuestName(e.target.value)
                                  }
                                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                                  placeholder="Jane Guest"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                                  Amount
                                </label>
                                <div className="relative">
                                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                                    $
                                  </span>
                                  <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={guestAmount}
                                    onChange={(e) =>
                                      setGuestAmount(e.target.value)
                                    }
                                    className="w-full rounded-xl border border-zinc-200 bg-white pl-6 pr-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                                    placeholder="100"
                                  />
                                </div>
                              </div>
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                                Optional note
                              </label>
                              <textarea
                                rows={2}
                                value={guestNote}
                                onChange={(e) =>
                                  setGuestNote(e.target.value)
                                }
                                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                                placeholder="Add a short message for the couple"
                              />
                            </div>

                            <button
                              type="submit"
                              disabled={loadingCheckout}
                              className="inline-flex w-full items-center justify-center rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring focus-visible:ring-indigo-500/60 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                            >
                              {loadingCheckout
                                ? "Opening secure checkout…"
                                : "Load gift on this card"}
                            </button>

                            {guestError && (
                              <p className="text-sm text-rose-600 dark:text-rose-400">
                                {guestError}
                              </p>
                            )}
                          </form>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-amber-900 dark:text-amber-100">
                            This GiftLink hasn&apos;t been loaded yet. Once a
                            guest uses the QR code to send a wedding gift, the
                            amount and their name will show up here and
                            you&apos;ll be able to claim it.
                          </p>
                          <button
                            disabled
                            className="inline-flex w-full items-center justify-center rounded-full bg-amber-300/70 px-4 py-2.5 text-sm font-medium text-amber-900 shadow-sm disabled:cursor-not-allowed dark:bg-amber-800/60 dark:text-amber-100"
                          >
                            Waiting for gift to be loaded
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.section>
          )}

          {/* Back link */}
          <div className="mt-6 flex justify-center">
            <Link
              href="/"
              className="text-sm font-medium text-indigo-600 underline-offset-4 hover:text-indigo-500 hover:underline dark:text-indigo-300 dark:hover:text-indigo-200"
            >
              Back to create a new GiftLink card
            </Link>
          </div>
        </motion.main>
      </div>
    </div>
  );
}
