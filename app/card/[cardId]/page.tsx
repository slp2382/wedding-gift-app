"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
  // Now support Venmo or Stripe Connect
  const [payoutMethod, setPayoutMethod] = useState<"venmo" | "stripe_connect">(
    "venmo",
  );
  const [payoutDetails, setPayoutDetails] = useState("");
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);

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
        setErrorMessage(error.message || "Card not found or something went wrong.");
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
          (result && result.error) || "Could not start checkout. Please try again.";
        setGuestError(message);
        setLoadingCheckout(false);
        return;
      }

      const result = await response.json();
      const redirectUrl = result.url || result.checkoutUrl;

      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        setGuestError("Checkout link was not returned. Please try again.");
        setLoadingCheckout(false);
      }
    } catch (err) {
      console.error("Error starting Stripe checkout:", err);
      setGuestError("Something went wrong while starting secure checkout.");
      setLoadingCheckout(false);
    }
  }

  // Venmo payout handler (existing behavior)
  async function handleSubmitVenmoPayout(e: FormEvent<HTMLFormElement>) {
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
      setPayoutError("Please enter your email so we can contact you about the payout.");
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
          payoutMethod: "venmo",
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

      // 2) Mark card as claimed immediately for Venmo
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
        "Thanks! We’ve received your Venmo details. Venmo payouts are typically sent the next business day after approval. We’ll email you when it is complete.",
      );
      setShowClaimForm(false);
    } catch (err) {
      console.error("Error submitting payout request:", err);
      setPayoutError("Something went wrong while submitting your payout request.");
    }

    setPayoutLoading(false);
  }

  // Stripe Connect payout handler (new behavior)
  async function handleStripePayout(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!card || !cardId) return;
    if (!isFunded || isClaimed) return;

    const name = payoutName.trim();
    const email = payoutEmail.trim();

    if (!name) {
      setPayoutError("Please enter your name.");
      return;
    }

    if (!email) {
      setPayoutError("Please enter your email so we can contact you about the payout.");
      return;
    }

    setPayoutError(null);
    setPayoutSuccess(null);
    setPayoutLoading(true);

    try {
      // 1) Create payout_requests row for Stripe Connect
      const res = await fetch("/api/request-payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId,
          contactName: name,
          contactEmail: email,
          payoutMethod: "stripe_connect",
          payoutDetails: null,
        }),
      });

      if (!res.ok) {
        const result = await res.json().catch(() => null);
        const message =
          (result && result.error) || "Could not start Stripe payout. Please try again.";
        setPayoutError(message);
        setPayoutLoading(false);
        return;
      }

      const { payoutRequestId } = await res.json();

      if (!payoutRequestId) {
        setPayoutError("Did not receive payoutRequestId from server.");
        setPayoutLoading(false);
        return;
      }

      // 2) Ensure a Connect account exists
      const createAccountRes = await fetch("/api/stripe/connect/createAccount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutRequestId }),
      });

      if (!createAccountRes.ok) {
        const result = await createAccountRes.json().catch(() => null);
        const message =
          (result && result.error) ||
          "Could not create Stripe Connect account. Please try again.";
        setPayoutError(message);
        setPayoutLoading(false);
        return;
      }

      // 3) Get onboarding link
      const onboardingRes = await fetch("/api/stripe/connect/onboardingLink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutRequestId }),
      });

      const onboardingData = await onboardingRes.json();

      if (!onboardingRes.ok || !onboardingData.url) {
        const message =
          onboardingData.error || "Could not start Stripe onboarding. Please try again.";
        setPayoutError(message);
        setPayoutLoading(false);
        return;
      }

      // 4) Redirect to Stripe hosted onboarding
      window.location.href = onboardingData.url;
    } catch (err) {
      console.error("Error starting Stripe payout:", err);
      setPayoutError("Something went wrong while starting bank payout setup.");
      setPayoutLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-emerald-50 to-emerald-100 px-4 py-6 text-emerald-950">
      <div className="mx-auto flex min-h-[90vh] max-w-3xl flex-col">
        {/* Top nav / wordmark */}
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-emerald-500 shadow-md shadow-emerald-400/40">
              <span className="text-lg font-semibold text-emerald-50">G</span>
            </div>
            <div className="leading-tight">
              <p className="text-lg font-semibold tracking-tight">GiftLink</p>
              <p className="text-xs text-emerald-700/80">Wedding gift QR cards</p>
            </div>
          </div>

          <div className="hidden text-xs font-medium text-emerald-800/80 md:block">
            <span className="rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 shadow-sm backdrop-blur">
              Guest view · Card scan
            </span>
          </div>
        </header>

        <main className="flex-1 space-y-6">
          {/* Hero / heading */}
          <section className="space-y-3 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Wedding Gift Card
            </p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Your GiftLink funds are ready!
            </h1>
            <p className="text-xs text-emerald-800/80">
              Card ID{" "}
              <span className="font-mono text-[11px] text-emerald-900">
                {cardId || "(missing)"}
              </span>
            </p>

            {/* Decorative line */}
            <div className="mt-3 flex items-center justify-center gap-3">
              <div className="h-px w-16 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600" />
              <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700/90">
                recipient view
              </p>
              <div className="h-px w-16 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400" />
            </div>
          </section>

          {/* Loading state */}
          {loading && (
            <section className="mt-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/80 p-6 text-center shadow-lg shadow-emerald-100/80 backdrop-blur-sm">
              <p className="text-sm text-emerald-900/90">Loading card details…</p>
            </section>
          )}

          {/* Error / not found */}
          {!loading && errorMessage && !card && (
            <section className="mt-4 rounded-2xl border border-rose-200/80 bg-rose-50/80 p-6 text-center shadow-md shadow-rose-100/60 backdrop-blur-sm">
              <p className="text-sm font-medium text-rose-700">{errorMessage}</p>
              <p className="mt-2 text-xs text-rose-700/80">
                Try scanning a different QR or creating a fresh card from the homepage.
              </p>
            </section>
          )}

          {/* Card content */}
          {!loading && card && (
            <section
              className={`mt-4 rounded-2xl border p-6 shadow-lg backdrop-blur-sm ${
                isClaimed
                  ? "border-emerald-300/80 bg-emerald-50/90 shadow-emerald-100/80"
                  : isFunded
                  ? "border-emerald-300/80 bg-emerald-50/90 shadow-emerald-100/80"
                  : "border-amber-200/80 bg-amber-50/90 shadow-amber-100/80"
              }`}
            >
              <div className="space-y-4">
                {/* Status pill */}
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="inline-flex items-center gap-2 rounded-full px-3 py-1">
                    {isClaimed ? (
                      <>
                        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.25)]" />
                        <span className="font-medium text-emerald-900">
                          Gift claimed
                        </span>
                      </>
                    ) : isFunded ? (
                      <>
                        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.25)]" />
                        <span className="font-medium text-emerald-900">
                          Gift ready to claim
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="inline-flex h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_0_4px_rgba(251,191,36,0.3)]" />
                        <span className="font-medium text-amber-900">
                          {isBlankStoreCard
                            ? "Store card ready for a gift"
                            : "Not funded yet"}
                        </span>
                      </>
                    )}
                  </div>

                  {!isFunded && !isClaimed && (
                    <p className="text-[11px] text-amber-900/80">
                      {isBlankStoreCard
                        ? "This card has been printed and activated, but no gift has been loaded yet."
                        : "Once a guest loads this card, it will appear here."}
                    </p>
                  )}

                  {isFunded && !isClaimed && (
                    <p className="text-[11px] text-emerald-900/80">
                      This gift has been funded and is waiting to be claimed.
                    </p>
                  )}

                  {isClaimed && (
                    <p className="text-[11px] text-emerald-900/80">
                      Claim received. Venmo payouts are typically sent the next business
                      day. Bank transfers typically take 3 to 5 business days to
                      complete.
                    </p>
                  )}
                </div>

                {/* Giver and amount */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-emerald-800/80">From</p>
                    <p className="text-lg font-semibold">
                      {card.giver_name ||
                        (isFunded ? "A generous guest" : "Waiting for a guest to load")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-emerald-800/80">Amount</p>
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
                  <div className="mt-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 shadow-sm shadow-emerald-100/80">
                    “{card.note}”
                  </div>
                )}

                {/* Status + actions */}
                <div className="space-y-3 border-t border-emerald-100 pt-4">
                  {isClaimed ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.25)]" />
                          <span className="font-medium text-emerald-900">
                            Gift claimed
                          </span>
                        </div>
                        <p className="text-xs text-emerald-900/80">
                          Saved to this card — you&apos;re all set.
                        </p>
                      </div>

                      <p className="text-xs text-emerald-900/80">
                        Venmo payouts are typically sent the next business day. Bank
                        transfers typically take 3 to 5 business days to complete.
                      </p>
                    </div>
                  ) : isFunded ? (
                    <>
                      <p className="text-sm text-emerald-900/90">
                        Choose how you would like to receive this gift, then enter
                        your details to claim it.
                      </p>

                      {/* Payout method toggle */}
                      <div className="mt-2 flex flex-col gap-2 text-xs">
                        <p className="font-medium text-emerald-900/90">Payout method</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setPayoutMethod("venmo")}
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${
                              payoutMethod === "venmo"
                                ? "border-emerald-600 bg-emerald-600 text-emerald-50"
                                : "border-emerald-200 bg-emerald-50 text-emerald-900"
                            }`}
                          >
                            Venmo
                          </button>
                          <button
                            type="button"
                            onClick={() => setPayoutMethod("stripe_connect")}
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${
                              payoutMethod === "stripe_connect"
                                ? "border-emerald-600 bg-emerald-600 text-emerald-50"
                                : "border-emerald-200 bg-emerald-50 text-emerald-900"
                            }`}
                          >
                            Bank payout
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowClaimForm((v) => !v)}
                        className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-medium text-emerald-50 shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring focus-visible:ring-emerald-500/60 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {showClaimForm
                          ? "Hide claim form"
                          : payoutMethod === "venmo"
                          ? "Claim gift via Venmo"
                          : "Claim gift via bank payout"}
                      </button>

                      {payoutSuccess && (
                        <p className="mt-2 text-xs text-emerald-900/90">
                          {payoutSuccess}
                        </p>
                      )}

                      {showClaimForm && (
                        <div className="mt-3 rounded-xl bg-emerald-50/80 p-3 text-xs text-emerald-900 shadow-sm">
                          <p className="mb-2 text-sm font-medium">
                            Where should we send this gift?
                          </p>

                          {payoutMethod === "venmo" ? (
                            <>
                              <p className="mb-3 text-xs text-emerald-800/90">
                                Enter your name, email, and Venmo handle and we&apos;ll
                                review and send your gift there shortly. Venmo is fast
                                and free and payouts are typically sent the next business
                                day.
                              </p>

                              <form
                                onSubmit={handleSubmitVenmoPayout}
                                className="space-y-3"
                              >
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-emerald-900/90">
                                      Your name
                                    </label>
                                    <input
                                      type="text"
                                      value={payoutName}
                                      onChange={(e) => setPayoutName(e.target.value)}
                                      className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                      placeholder="Name for payout"
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-emerald-900/90">
                                      Email for payout confirmation
                                    </label>
                                    <input
                                      type="email"
                                      value={payoutEmail}
                                      onChange={(e) => setPayoutEmail(e.target.value)}
                                      className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                      placeholder="you@example.com"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="mb-1 block text-xs font-medium text-emerald-900/90">
                                    Venmo handle
                                  </label>
                                  <input
                                    type="text"
                                    value={payoutDetails}
                                    onChange={(e) => setPayoutDetails(e.target.value)}
                                    className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                    placeholder="@your-venmo-handle"
                                  />
                                  <p className="mt-1 text-[11px] text-emerald-800/90">
                                    We’ll use this Venmo handle to send your gift.
                                    Make sure it matches your Venmo profile exactly.
                                  </p>
                                </div>

                                {payoutError && (
                                  <p className="text-xs text-rose-600">
                                    {payoutError}
                                  </p>
                                )}

                                <button
                                  type="submit"
                                  disabled={payoutLoading}
                                  className="inline-flex w-full items-center justify-center rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-medium text-emerald-50 shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring focus-visible:ring-emerald-500/60 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                  {payoutLoading ? "Sending claim…" : "Submit Venmo details"}
                                </button>
                              </form>
                            </>
                          ) : (
                            <>
                              <p className="mb-3 text-xs text-emerald-800/90">
                                We&apos;ll connect to Stripe to securely set up a bank
                                payout. Enter your name and email, then we&apos;ll take
                                you to Stripe to add your bank details. Bank payouts
                                can take 3 to 5 business days and a payout processing
                                fee applies and will be deducted from the gift amount.
                                (Processing fee of 3.5% of gift amount plus $0.30)
                              </p>

                              <form onSubmit={handleStripePayout} className="space-y-3">
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-emerald-900/90">
                                      Your name
                                    </label>
                                    <input
                                      type="text"
                                      value={payoutName}
                                      onChange={(e) => setPayoutName(e.target.value)}
                                      className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                      placeholder="Name for payout"
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-emerald-900/90">
                                      Email for payout updates
                                    </label>
                                    <input
                                      type="email"
                                      value={payoutEmail}
                                      onChange={(e) => setPayoutEmail(e.target.value)}
                                      className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                      placeholder="you@example.com"
                                    />
                                  </div>
                                </div>

                                {payoutError && (
                                  <p className="text-xs text-rose-600">{payoutError}</p>
                                )}

                                <button
                                  type="submit"
                                  disabled={payoutLoading}
                                  className="inline-flex w-full items-center justify-center rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-medium text-emerald-50 shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring focus-visible:ring-emerald-500/60 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                  {payoutLoading
                                    ? "Starting secure bank setup…"
                                    : "Continue with Stripe"}
                                </button>
                              </form>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {isBlankStoreCard ? (
                        <>
                          <p className="text-sm text-amber-900">
                            This GiftLink card is ready for a guest to load. When
                            someone uses this QR link to send a gift, the amount and
                            their name will appear here for the recipient to claim.
                          </p>

                          <form onSubmit={handleGuestLoad} className="mt-3 space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-emerald-900/90">
                                  Your name
                                </label>
                                <input
                                  type="text"
                                  value={guestName}
                                  onChange={(e) => setGuestName(e.target.value)}
                                  className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                  placeholder="Jane Guest"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-emerald-900/90">
                                  Amount
                                </label>
                                <div className="relative">
                                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-emerald-700/70">
                                    $
                                  </span>
                                  <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={guestAmount}
                                    onChange={(e) => setGuestAmount(e.target.value)}
                                    className="w-full rounded-xl border border-emerald-200 bg-emerald-50 pl-6 pr-3 py-2 text-sm text-emerald-950 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                    placeholder="100"
                                  />
                                </div>
                              </div>
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-medium text-emerald-900/90">
                                Optional note
                              </label>
                              <textarea
                                rows={2}
                                value={guestNote}
                                onChange={(e) => setGuestNote(e.target.value)}
                                className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                placeholder="Add a short message for the recipient"
                              />
                            </div>

                            <button
                              type="submit"
                              disabled={loadingCheckout}
                              className="inline-flex w-full items-center justify-center rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-medium text-emerald-50 shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring focus-visible:ring-emerald-500/60 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {loadingCheckout
                                ? "Opening secure checkout…"
                                : "Load gift on this card"}
                            </button>

                            {guestError && (
                              <p className="text-sm text-rose-600">{guestError}</p>
                            )}
                          </form>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-amber-900">
                            This GiftLink hasn&apos;t been loaded yet. Once a guest
                            uses the QR code to send a wedding gift, the amount and
                            their name will show up here and you&apos;ll be able to
                            claim it.
                          </p>
                          <button
                            disabled
                            className="inline-flex w-full items-center justify-center rounded-full bg-amber-300/80 px-4 py-2.5 text-sm font-medium text-amber-900 shadow-sm disabled:cursor-not-allowed"
                          >
                            Waiting for gift to be loaded
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Back link */}
          <div className="mt-6 flex justify-center">
            <Link
              href="/"
              className="text-sm font-medium text-emerald-800 underline-offset-4 hover:text-emerald-700 hover:underline"
            >
              Back to create a new GiftLink card
            </Link>
          </div>

          <div className="mt-3 text-center text-xs text-emerald-800/80">
            Need help? Contact{" "}
            <a
              href="mailto:admin@giftlink.cards"
              className="font-medium underline-offset-4 hover:underline"
            >
              admin@giftlink.cards
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}
