"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
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
  const [claiming, setClaiming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Guest load form state
  const [guestName, setGuestName] = useState("");
  const [guestAmount, setGuestAmount] = useState("");
  const [guestNote, setGuestNote] = useState("");
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);

  // Flip animation state
  const [flipKey, setFlipKey] = useState(0);
  const prevFundedRef = useRef(false);
  const prevClaimedRef = useRef(false);

  // Load card details from Supabase on first render
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

  // Central state flags for card status
  const amount = card && card.amount != null ? Number(card.amount) : 0;

  const isBlankStoreCard = !!card && amount <= 0 && !card.claimed;
  const isFunded = !!card && amount > 0 && !card.claimed;
  const isClaimed = !!card && card.claimed;

  // Trigger flip animation when card transitions to funded or claimed
  useEffect(() => {
    const prevFunded = prevFundedRef.current;
    const prevClaimed = prevClaimedRef.current;

    if ((!prevFunded && isFunded) || (!prevClaimed && isClaimed)) {
      setFlipKey((k) => k + 1);
    }

    prevFundedRef.current = isFunded;
    prevClaimedRef.current = isClaimed;
  }, [isFunded, isClaimed]);

  // Claim via API route instead of direct Supabase client
  async function handleClaim() {
    if (!card || !cardId) return;
    if (!isFunded) {
      setErrorMessage("This card has not been funded yet.");
      return;
    }
    if (card.claimed) return;

    setClaiming(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/claim-gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        const message =
          (result && result.error) ||
          "Could not mark this gift as claimed.";
        setErrorMessage(message);
        setClaiming(false);
        return;
      }

      const result = await response.json();
      if (result && result.card) {
        setCard(result.card as CardRecord);
      }
    } catch (error) {
      console.error("Error calling /api/claim-gift:", error);
      setErrorMessage("Something went wrong while claiming this gift.");
    }

    setClaiming(false);
  }

  // Guest load handler for blank store cards
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-indigo-50/60 to-zinc-50 px-4 py-6 text-zinc-900 dark:from-zinc-950 dark:via-slate-950 dark:to-zinc-950 dark:text-zinc-50">
      <div className="mx-auto flex min-h-[90vh] max-w-3xl flex-col">
        {/* Top nav / wordmark */}
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-400 to-emerald-400 shadow-md shadow-indigo-500/30 dark:shadow-indigo-700/40">
              <span className="text-lg font-semibold text-white">
                G
              </span>
            </div>
            <div className="leading-tight">
              <p className="text-lg font-semibold tracking-tight">
                GiftLink
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Wedding gift QR cards
              </p>
            </div>
          </div>

          <div className="hidden text-xs font-medium text-zinc-500 md:block dark:text-zinc-400">
            <span className="rounded-full border border-zinc-200/80 bg-white/60 px-3 py-1 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60">
              Guest view · Card scan
            </span>
          </div>
        </header>

        <main className="flex-1 space-y-6">
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
                      Status saved, this card is fully received.
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

                {/* Status and action */}
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
                        Saved to this card, you&apos;re all set.
                      </p>
                    </div>
                  ) : isFunded ? (
                    <>
                      <p className="text-sm text-zinc-600 dark:text-zinc-300">
                        When you tap claim, this gift is marked as received for
                        this card. In a future version, this will also move the
                        funds to your account.
                      </p>
                      <button
                        onClick={handleClaim}
                        disabled={claiming}
                        className="inline-flex w-full items-center justify-center rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring focus-visible:ring-indigo-500/60 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                      >
                        {claiming ? "Claiming gift…" : "Claim gift"}
                      </button>
                      {errorMessage && (
                        <p className="text-sm text-rose-600 dark:text-rose-400">
                          {errorMessage}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      {isBlankStoreCard ? (
                        <>
                          <p className="text-sm text-amber-900 dark:text-amber-100">
                            This GiftLink card is ready for a guest to load.
                            When someone uses this QR link to send a gift, the
                            amount and their name will appear here for the
                            couple to claim.
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
                            This GiftLink has not been loaded yet. Once a guest
                            uses the QR code to send a wedding gift, the amount
                            and their name will show up here and you will be
                            able to claim it.
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
        </main>
      </div>
    </div>
  );
}
