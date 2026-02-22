"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
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
  const [guestPinLast4, setGuestPinLast4] = useState("");
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);

  // Claim funds / payout request state
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [payoutName, setPayoutName] = useState("");
  const [payoutEmail, setPayoutEmail] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<"venmo" | "stripe_connect">(
    "venmo",
  );
  const [payoutDetails, setPayoutDetails] = useState("");
  const [claimPinLast4, setClaimPinLast4] = useState("");
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

  const heroTitle = loading
    ? "Loading card details..."
    : isFunded
      ? "Your givio gift is ready!"
      : isClaimed
        ? "This givio gift has been claimed"
        : "This card is ready to be loaded with a gift";

  const showRecipientViewDecor = !loading && (isFunded || isClaimed);

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

    const pin = guestPinLast4.trim();
    if (!/^\d{4}$/.test(pin)) {
      setGuestError("Enter the last 4 digits of your phone number.");
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
          pinLast4: pin,
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

  // Venmo payout handler
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

    const pin = claimPinLast4.trim();
    if (!/^\d{4}$/.test(pin)) {
      setPayoutError("Enter the last 4 digits pin to claim this gift.");
      return;
    }

    setPayoutError(null);
    setPayoutSuccess(null);
    setPayoutLoading(true);

    try {
      const res = await fetch("/api/request-payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId,
          contactName: name,
          contactEmail: email,
          payoutMethod: "venmo",
          payoutDetails: details,
          pinLast4: pin,
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

      const claimRes = await fetch("/api/claim-gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, pinLast4: pin }),
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

  // Stripe Connect payout handler
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

    const pin = claimPinLast4.trim();
    if (!/^\d{4}$/.test(pin)) {
      setPayoutError("Enter the last 4 digits pin to claim this gift.");
      return;
    }

    setPayoutError(null);
    setPayoutSuccess(null);
    setPayoutLoading(true);

    try {
      const res = await fetch("/api/request-payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId,
          contactName: name,
          contactEmail: email,
          payoutMethod: "stripe_connect",
          payoutDetails: null,
          pinLast4: pin,
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

      try {
        sessionStorage.setItem(`givio_pin_${payoutRequestId}`, pin);
      } catch {
        // ignore storage errors
      }

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

      window.location.href = onboardingData.url;
    } catch (err) {
      console.error("Error starting Stripe payout:", err);
      setPayoutError("Something went wrong while starting bank payout setup.");
      setPayoutLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-sky-50 to-slate-100 px-4 py-6 text-slate-950 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950 dark:text-slate-50">
      <div className="mx-auto flex min-h-[90vh] max-w-3xl flex-col">
        <header className="mb-8 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full flex-col items-center gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
            <div className="relative h-14 w-72 sm:h-12 sm:w-64 md:h-12 md:w-72">
              <Image
                src="/givio_logo.svg"
                alt="givio cards"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          <div className="hidden text-xs font-medium text-slate-800/80 md:block dark:text-slate-200/80">
            <span className="rounded-full border border-sky-200/80 bg-sky-50/80 px-3 py-1 shadow-sm backdrop-blur dark:border-sky-700/70 dark:bg-sky-950/60">
              Guest view · Card scan
            </span>
          </div>
        </header>

        <main className="flex-1 space-y-6">
          <section className="space-y-3 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-sky-700 dark:text-sky-300">
              QR Powered Gifting
            </p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {heroTitle}
            </h1>
            <p className="text-xs text-slate-900/70 dark:text-slate-200/80">
              Card ID{" "}
              <span className="font-mono text-[11px] text-slate-900 dark:text-slate-50">
                {cardId || "(missing)"}
              </span>
            </p>

            {showRecipientViewDecor && (
              <div className="mt-3 flex items-center justify-center gap-3">
                <div className="h-px w-16 bg-gradient-to-r from-sky-400 via-sky-500 to-sky-600" />
                <p className="text-[11px] uppercase tracking-[0.18em] text-sky-700/90 dark:text-sky-300/90">
                  recipient view
                </p>
                <div className="h-px w-16 bg-gradient-to-r from-sky-600 via-sky-500 to-sky-400" />
              </div>
            )}
          </section>

          {loading && (
            <section className="mt-4 rounded-2xl border border-sky-200/80 bg-sky-50/80 p-6 text-center shadow-lg shadow-sky-100/70 backdrop-blur-sm dark:border-sky-700/70 dark:bg-sky-950/60 dark:shadow-none">
              <p className="text-sm text-slate-900/90 dark:text-slate-100/90">
                Loading card details…
              </p>
            </section>
          )}

          {!loading && errorMessage && !card && (
            <section className="mt-4 rounded-2xl border border-rose-200/80 bg-rose-50/80 p-6 text-center shadow-md shadow-rose-100/60 backdrop-blur-sm">
              <p className="text-sm font-medium text-rose-700">{errorMessage}</p>
              <p className="mt-2 text-xs text-rose-700/80">
                Try scanning a different QR or creating a fresh card from the homepage.
              </p>
            </section>
          )}

          {!loading && card && (
            <section
              className={`mt-4 rounded-2xl border p-6 shadow-lg backdrop-blur-sm ${
                isClaimed
                  ? "border-sky-200/80 bg-slate-50/95 shadow-sky-100/70 dark:border-sky-700/70 dark:bg-slate-950/90 dark:shadow-none"
                  : isFunded
                    ? "border-sky-200/80 bg-slate-50/95 shadow-sky-100/70 dark:border-sky-700/70 dark:bg-slate-950/90 dark:shadow-none"
                    : "border-slate-200/80 bg-slate-50/95 shadow-slate-100/70 dark:border-slate-800/70 dark:bg-slate-950/90 dark:shadow-none"
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="inline-flex items-center gap-2 rounded-full px-3 py-1">
                    {isClaimed ? (
                      <>
                        <span className="inline-flex h-2 w-2 rounded-full bg-sky-500 shadow-[0_0_0_4px_rgba(14,165,233,0.25)]" />
                        <span className="font-medium text-slate-900 dark:text-slate-50">
                          Gift claimed
                        </span>
                      </>
                    ) : isFunded ? (
                      <>
                        <span className="inline-flex h-2 w-2 rounded-full bg-sky-500 shadow-[0_0_0_4px_rgba(14,165,233,0.25)]" />
                        <span className="font-medium text-slate-900 dark:text-slate-50">
                          Gift ready to claim
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="inline-flex h-2 w-2 rounded-full bg-slate-400 shadow-[0_0_0_4px_rgba(148,163,184,0.25)]" />
                        <span className="font-medium text-slate-900 dark:text-slate-50">
                          {isBlankStoreCard
                            ? "Store card ready for a gift"
                            : "Not funded yet"}
                        </span>
                      </>
                    )}
                  </div>

                  {!isFunded && !isClaimed && (
                    <p className="text-[11px] text-slate-900/70 dark:text-slate-200/80">
                      {isBlankStoreCard
                        ? "This card has been printed and activated, but no gift has been loaded yet."
                        : "Once a guest loads this card, it will appear here."}
                    </p>
                  )}

                  {isFunded && !isClaimed && (
                    <p className="text-[11px] text-slate-900/70 dark:text-slate-200/80">
                      This gift has been funded and is waiting to be claimed.
                    </p>
                  )}

                  {isClaimed && (
                    <p className="text-[11px] text-slate-900/70 dark:text-slate-200/80">
                      Claim received. Venmo payouts are typically sent the next business
                      day. Bank transfers typically take 3 to 5 business days to
                      complete.
                    </p>
                  )}
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-900/70 dark:text-slate-200/80">
                      From
                    </p>
                    <p className="text-lg font-semibold">
                      {card.giver_name ||
                        (isFunded ? "A generous guest" : "Waiting for a guest to load")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-900/70 dark:text-slate-200/80">
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

                {card.note && (
                  <div className="mt-2 rounded-xl bg-sky-50 p-3 text-sm text-slate-900 shadow-sm shadow-sky-100/70 dark:bg-slate-950/70 dark:text-slate-50">
                    “{card.note}”
                  </div>
                )}

                <div className="space-y-3 border-t border-sky-100/80 pt-4 dark:border-sky-800/70">
                  {isClaimed ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-2 w-2 rounded-full bg-sky-500 shadow-[0_0_0_4px_rgba(14,165,233,0.25)]" />
                          <span className="font-medium text-slate-900 dark:text-slate-50">
                            Gift claimed
                          </span>
                        </div>
                        <p className="text-xs text-slate-900/70 dark:text-slate-200/80">
                          Saved to this card — you&apos;re all set.
                        </p>
                      </div>

                      <p className="text-xs text-slate-900/70 dark:text-slate-200/80">
                        Venmo payouts are typically sent the next business day. Bank
                        transfers typically take 3 to 5 business days to complete.
                      </p>
                    </div>
                  ) : isFunded ? (
                    <>
                      <p className="text-sm text-slate-900/90 dark:text-slate-100/90">
                        Choose how you would like to receive this gift, then enter
                        your details to claim it.
                      </p>

                      <div className="mt-2 flex flex-col gap-2 text-xs">
                        <p className="font-medium text-slate-900/90 dark:text-slate-100/90">
                          Payout method
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setPayoutMethod("venmo")}
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${
                              payoutMethod === "venmo"
                                ? "border-sky-700 bg-sky-700 dark:border-sky-400 dark:bg-sky-500 text-white"
                                : "border-sky-200 bg-sky-50 text-slate-950 dark:border-sky-700 dark:bg-sky-950/70 dark:text-slate-50"
                            }`}
                          >
                            Venmo
                          </button>
                          <button
                            type="button"
                            onClick={() => setPayoutMethod("stripe_connect")}
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${
                              payoutMethod === "stripe_connect"
                                ? "border-sky-700 bg-sky-700 dark:border-sky-400 dark:bg-sky-500 text-white"
                                : "border-sky-200 bg-sky-50 text-slate-950 dark:border-sky-700 dark:bg-sky-950/70 dark:text-slate-50"
                            }`}
                          >
                            Bank payout
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowClaimForm((v) => !v)}
                        className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-sky-700 dark:bg-sky-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-600 dark:hover:bg-sky-400 focus-visible:outline-none focus-visible:ring focus-visible:ring-sky-500/60 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {showClaimForm
                          ? "Hide claim form"
                          : payoutMethod === "venmo"
                            ? "Claim gift via Venmo"
                            : "Claim gift via bank payout"}
                      </button>

                      {payoutSuccess && (
                        <p className="mt-2 text-xs text-slate-900/90 dark:text-slate-100/90">
                          {payoutSuccess}
                        </p>
                      )}

                      {showClaimForm && (
                        <div className="mt-3 rounded-xl bg-sky-50/80 p-3 text-xs text-slate-900 shadow-sm dark:bg-slate-950/70 dark:text-slate-50">
                          <p className="mb-2 text-sm font-medium">
                            Where should we send this gift?
                          </p>

                          <div className="mb-3">
                            <label className="mb-1 block text-xs font-medium text-slate-900/90 dark:text-slate-100/90">
                              Last 4 digits of gifters phone number
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="\d{4}"
                              maxLength={4}
                              value={claimPinLast4}
                              onChange={(e) =>
                                setClaimPinLast4(
                                  e.target.value.replace(/[^\d]/g, ""),
                                )
                              }
                              className="w-full rounded-xl border border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-slate-950 px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500 dark:text-slate-50"
                              placeholder="1234"
                            />
                            <p className="mt-1 text-[11px] text-slate-900/80 dark:text-slate-200/80">
                              This must match the last 4 digits entered when the gift was loaded.
                            </p>
                          </div>

                          {payoutMethod === "venmo" ? (
                            <>
                              <p className="mb-3 text-xs text-slate-900/80 dark:text-slate-200/80">
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
                                    <label className="mb-1 block text-xs font-medium text-slate-900/90 dark:text-slate-100/90">
                                      Your name
                                    </label>
                                    <input
                                      type="text"
                                      value={payoutName}
                                      onChange={(e) => setPayoutName(e.target.value)}
                                      className="w-full rounded-xl border border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-slate-950 px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500 dark:text-slate-50"
                                      placeholder="Name for payout"
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-900/90 dark:text-slate-100/90">
                                      Email for payout confirmation
                                    </label>
                                    <input
                                      type="email"
                                      value={payoutEmail}
                                      onChange={(e) => setPayoutEmail(e.target.value)}
                                      className="w-full rounded-xl border border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-slate-950 px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500 dark:text-slate-50"
                                      placeholder="you@example.com"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="mb-1 block text-xs font-medium text-slate-900/90 dark:text-slate-100/90">
                                    Venmo handle
                                  </label>
                                  <input
                                    type="text"
                                    value={payoutDetails}
                                    onChange={(e) => setPayoutDetails(e.target.value)}
                                    className="w-full rounded-xl border border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-slate-950 px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500 dark:text-slate-50"
                                    placeholder="@your-venmo-handle"
                                  />
                                  <p className="mt-1 text-[11px] text-slate-900/80 dark:text-slate-200/80">
                                    We’ll use this Venmo handle to send your gift.
                                    Make sure it matches your Venmo profile exactly.
                                  </p>
                                </div>

                                {payoutError && (
                                  <p className="text-xs text-rose-600">{payoutError}</p>
                                )}

                                <button
                                  type="submit"
                                  disabled={payoutLoading}
                                  className="inline-flex w-full items-center justify-center rounded-full bg-sky-700 dark:bg-sky-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-600 dark:hover:bg-sky-400 focus-visible:outline-none focus-visible:ring focus-visible:ring-sky-500/60 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                  {payoutLoading
                                    ? "Sending claim…"
                                    : "Submit Venmo details"}
                                </button>
                              </form>
                            </>
                          ) : (
                            <>
                              <p className="mb-3 text-xs text-slate-900/80 dark:text-slate-200/80">
                                We&apos;ll connect to Stripe to securely set up a bank
                                payout. Enter your name and email, then we&apos;ll take
                                you to Stripe to add your bank details. Bank payouts
                                can take 3 to 5 business days and a payout processing
                                fee applies and will be deducted from the gift amount.
                                (Processing fee of $2.50 will be deducted from the gift)
                              </p>

                              <form onSubmit={handleStripePayout} className="space-y-3">
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-900/90 dark:text-slate-100/90">
                                      Your name
                                    </label>
                                    <input
                                      type="text"
                                      value={payoutName}
                                      onChange={(e) => setPayoutName(e.target.value)}
                                      className="w-full rounded-xl border border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-slate-950 px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500 dark:text-slate-50"
                                      placeholder="Name for payout"
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-900/90 dark:text-slate-100/90">
                                      Email for payout updates
                                    </label>
                                    <input
                                      type="email"
                                      value={payoutEmail}
                                      onChange={(e) => setPayoutEmail(e.target.value)}
                                      className="w-full rounded-xl border border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-slate-950 px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500 dark:text-slate-50"
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
                                  className="inline-flex w-full items-center justify-center rounded-full bg-sky-700 dark:bg-sky-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-600 dark:hover:bg-sky-400 focus-visible:outline-none focus-visible:ring focus-visible:ring-sky-500/60 disabled:cursor-not-allowed disabled:opacity-70"
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
                          <p className="text-sm text-slate-900/80 dark:text-slate-200/80">
                            This givio card is ready for a guest to load. When
                            someone uses this QR link to send a gift, the amount and
                            their name will appear here for the recipient to claim.
                          </p>

                          <form onSubmit={handleGuestLoad} className="mt-3 space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-900/90 dark:text-slate-100/90">
                                  Your name
                                </label>
                                <input
                                  type="text"
                                  value={guestName}
                                  onChange={(e) => setGuestName(e.target.value)}
                                  className="w-full rounded-xl border border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-slate-950 px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500 dark:text-slate-50"
                                  placeholder="Guest Name"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-900/90 dark:text-slate-100/90">
                                  Amount
                                </label>
                                <div className="relative">
                                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-700/70 dark:text-slate-300/70">
                                    $
                                  </span>
                                  <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={guestAmount}
                                    onChange={(e) => setGuestAmount(e.target.value)}
                                    className="w-full rounded-xl border border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-slate-950 pl-6 pr-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500 dark:text-slate-50"
                                    placeholder="100"
                                  />
                                </div>
                              </div>
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-900/90 dark:text-slate-100/90">
                                Last 4 digits of gifters phone number
                              </label>
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="\d{4}"
                                maxLength={4}
                                value={guestPinLast4}
                                onChange={(e) =>
                                  setGuestPinLast4(
                                    e.target.value.replace(/[^\d]/g, ""),
                                  )
                                }
                                className="w-full rounded-xl border border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-slate-950 px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500 dark:text-slate-50"
                                placeholder="1234"
                              />
                              <p className="mt-1 text-[11px] text-slate-900/80 dark:text-slate-200/80">
                                The recipient will enter this to claim the gift.
                              </p>
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-900/90 dark:text-slate-100/90">
                                Optional note
                              </label>
                              <textarea
                                rows={2}
                                value={guestNote}
                                onChange={(e) => setGuestNote(e.target.value)}
                                className="w-full rounded-xl border border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-slate-950 px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500 dark:text-slate-50"
                                placeholder="Add a short message for the recipient"
                              />
                            </div>

                            <button
                              type="submit"
                              disabled={loadingCheckout}
                              className="inline-flex w-full items-center justify-center rounded-full bg-sky-700 dark:bg-sky-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-600 dark:hover:bg-sky-400 focus-visible:outline-none focus-visible:ring focus-visible:ring-sky-500/60 disabled:cursor-not-allowed disabled:opacity-70"
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
                          <p className="text-sm text-slate-900/80 dark:text-slate-200/80">
                            This givio card hasn&apos;t been loaded yet. Once a guest
                            uses the QR code to send a gift, the amount and
                            their name will show up here and you&apos;ll be able to
                            claim it.
                          </p>
                          <button
                            disabled
                            className="inline-flex w-full items-center justify-center rounded-full bg-slate-200/80 dark:bg-slate-800/70 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-50 shadow-sm disabled:cursor-not-allowed"
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

          <div className="mt-6 flex justify-center">
            <Link
              href="/"
              className="text-sm font-medium text-sky-900 underline-offset-4 hover:text-sky-700 hover:underline dark:text-sky-200"
            >
              Back to givio cards Home
            </Link>
          </div>

          <div className="mt-3 text-center text-xs text-slate-800/80 dark:text-slate-200/80">
            Need help? Contact{" "}
            <a
              href="mailto:admin@giviocards.com"
              className="font-medium underline-offset-4 hover:underline"
            >
              admin@giviocards.com
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}