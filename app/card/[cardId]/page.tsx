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

const BANK_PAYOUT_NOTICE =
  "A GiftLink fee of 3.5 percent plus $0.30 will be deducted from your payout amount. Bank payouts typically arrive within 3 business days.";

export default function CardPage() {
  const params = useParams() as { id?: string };
  const cardId = params?.id ?? "";

  const [loading, setLoading] = useState(true);
  const [card, setCard] = useState<CardRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [amountCents, setAmountCents] = useState<number>(0);
  const [giverName, setGiverName] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  const [showClaimForm, setShowClaimForm] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<"venmo" | "stripe_connect">(
    "venmo",
  );

  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);

  const [contactName, setContactName] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");
  const [venmoHandle, setVenmoHandle] = useState<string>("");

  const isBlankStoreCard = card?.giver_name === "GiftLink Store";

  useEffect(() => {
    let cancelled = false;

    async function loadCard() {
      if (!cardId) return;

      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from("cards")
        .select("card_id,giver_name,amount,note,claimed,created_at")
        .eq("card_id", cardId)
        .maybeSingle();

      if (cancelled) return;

      if (err) {
        setError(err.message);
        setCard(null);
      } else if (!data) {
        setError("Card not found");
        setCard(null);
      } else {
        setCard(data as CardRecord);
      }

      setLoading(false);
    }

    loadCard();

    return () => {
      cancelled = true;
    };
  }, [cardId]);

  async function handleAddGift(e: FormEvent) {
    e.preventDefault();
    setAddError(null);
    setAddSuccess(null);

    if (!cardId) {
      setAddError("Missing card id");
      return;
    }

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setAddError("Enter a valid amount");
      return;
    }

    setAddLoading(true);
    try {
      const resp = await fetch("/api/gift/add", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cardId,
          amountCents,
          giverName: giverName || null,
          note: note || null,
        }),
      });

      const json = await resp.json().catch(() => null);

      if (!resp.ok) {
        setAddError(json?.error || "Failed to add gift");
        setAddLoading(false);
        return;
      }

      setAddSuccess("Payment started. Complete checkout to load the gift.");
      setAddLoading(false);

      const url = json?.url;
      if (url) window.location.href = url;
    } catch (err: any) {
      setAddError(err?.message ?? "Unexpected error");
      setAddLoading(false);
    }
  }

  async function handleVenmoPayout(e: FormEvent) {
    e.preventDefault();
    setPayoutError(null);
    setPayoutSuccess(null);

    if (!cardId) {
      setPayoutError("Missing card id");
      return;
    }

    if (!contactName.trim() || !contactEmail.trim() || !venmoHandle.trim()) {
      setPayoutError("Please fill in name, email, and Venmo handle");
      return;
    }

    setPayoutLoading(true);
    try {
      const resp = await fetch("/api/payout/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cardId,
          payoutMethod: "venmo",
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
          payoutDetails: venmoHandle.trim(),
        }),
      });

      const json = await resp.json().catch(() => null);

      if (!resp.ok) {
        setPayoutError(json?.error || "Failed to request payout");
        setPayoutLoading(false);
        return;
      }

      setPayoutSuccess(
        "Venmo payout request submitted. You will receive an email once it is processed.",
      );
      setPayoutLoading(false);
    } catch (err: any) {
      setPayoutError(err?.message ?? "Unexpected error");
      setPayoutLoading(false);
    }
  }

  async function handleStripePayout(e: FormEvent) {
    e.preventDefault();
    setPayoutError(null);
    setPayoutSuccess(null);

    if (!cardId) {
      setPayoutError("Missing card id");
      return;
    }

    if (!contactName.trim() || !contactEmail.trim()) {
      setPayoutError("Please fill in name and email");
      return;
    }

    setPayoutLoading(true);
    try {
      const resp = await fetch("/api/payout/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cardId,
          payoutMethod: "stripe_connect",
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
          payoutDetails: null,
        }),
      });

      const json = await resp.json().catch(() => null);

      if (!resp.ok) {
        setPayoutError(json?.error || "Failed to request payout");
        setPayoutLoading(false);
        return;
      }

      const payoutRequestId = json?.payoutRequestId as string | undefined;
      if (!payoutRequestId) {
        setPayoutError("Missing payoutRequestId");
        setPayoutLoading(false);
        return;
      }

      const resp2 = await fetch("/api/stripe/connect/onboardingLink", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ payoutRequestId }),
      });

      const json2 = await resp2.json().catch(() => null);

      if (!resp2.ok) {
        setPayoutError(json2?.error || "Failed to start bank setup");
        setPayoutLoading(false);
        return;
      }

      const url = json2?.url as string | undefined;
      if (!url) {
        setPayoutError("Missing Stripe onboarding URL");
        setPayoutLoading(false);
        return;
      }

      window.location.href = url;
    } catch (err: any) {
      setPayoutError(err?.message ?? "Unexpected error");
      setPayoutLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <div className="mx-auto max-w-xl">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            Loading card…
          </div>
        </div>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <div className="mx-auto max-w-xl">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {error || "Card not found"}
            </p>
            <div className="mt-4">
              <Link
                href="/"
                className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
              >
                Back to GiftLink
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const amount = card.amount ?? 0;
  const isClaimed = Boolean(card.claimed);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-emerald-50 to-zinc-50 px-4 py-10 text-zinc-900 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-xl">
        <header className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            GiftLink
          </Link>

          <Link
            href="/shop"
            className="inline-flex rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-medium text-emerald-900 shadow-sm transition hover:bg-emerald-50 dark:border-emerald-700 dark:bg-zinc-950 dark:text-emerald-100 dark:hover:bg-zinc-900"
          >
            Buy more cards
          </Link>
        </header>

        <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm dark:border-emerald-900 dark:bg-zinc-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-200/70">
                GiftLink card
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                {card.card_id}
              </h1>
            </div>

            <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100">
              {isClaimed ? "Claimed" : "Unclaimed"}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 dark:border-emerald-900/30 dark:bg-emerald-900/10">
            <p className="text-xs text-emerald-700/80 dark:text-emerald-200/70">
              Current balance
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">
              ${(amount / 100).toFixed(2)}
            </p>

            {card.giver_name && (
              <p className="mt-2 text-sm text-emerald-900/80 dark:text-emerald-100/80">
                From {card.giver_name}
              </p>
            )}

            {card.note && (
              <p className="mt-2 text-sm text-emerald-900/80 dark:text-emerald-100/80">
                {card.note}
              </p>
            )}
          </div>

          {!isBlankStoreCard && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Add a gift
              </h2>

              <p className="mt-2 text-xs text-zinc-700 dark:text-zinc-300">
                Load money onto this card using secure checkout.
              </p>

              <form onSubmit={handleAddGift} className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Amount in dollars
                  </label>
                  <input
                    inputMode="decimal"
                    value={(amountCents / 100).toString()}
                    onChange={(e) => {
                      const v = e.target.value;
                      const n = Number(v);
                      if (!Number.isFinite(n)) {
                        setAmountCents(0);
                      } else {
                        setAmountCents(Math.round(n * 100));
                      }
                    }}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-emerald-200 focus:ring dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                    placeholder="25"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Your name
                  </label>
                  <input
                    value={giverName}
                    onChange={(e) => setGiverName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-emerald-200 focus:ring dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Note
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-emerald-200 focus:ring dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                    placeholder="Optional"
                    rows={3}
                  />
                </div>

                {addError && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {addError}
                  </p>
                )}
                {addSuccess && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-200">
                    {addSuccess}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={addLoading}
                  className="inline-flex w-full items-center justify-center rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-emerald-50 shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {addLoading ? "Starting checkout…" : "Add gift"}
                </button>
              </form>
            </div>
          )}

          <div className="mt-8 border-t border-zinc-100 pt-6 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Claim this card
            </h2>

            {isClaimed ? (
              <p className="mt-2 text-xs text-zinc-700 dark:text-zinc-300">
                This card has already been claimed.
              </p>
            ) : (
              <>
                <p className="mt-2 text-xs text-zinc-700 dark:text-zinc-300">
                  Choose a payout option and submit your details to claim the
                  balance.
                </p>

                <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 dark:border-emerald-900/30 dark:bg-emerald-900/10">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-emerald-900 dark:text-emerald-100">
                        Payout method
                      </p>
                      <p className="mt-1 text-xs text-emerald-800/90 dark:text-emerald-200/80">
                        Venmo requests are processed manually. Bank payout uses
                        Stripe and can be completed immediately.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
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

                  {payoutMethod === "stripe_connect" && (
                    <p className="mt-2 text-xs text-emerald-800/90">
                      {BANK_PAYOUT_NOTICE}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowClaimForm((v) => !v)}
                    className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-emerald-50 shadow-sm transition hover:bg-emerald-800 disabled:border-emerald-500/60 disabled:cursor-not-allowed disabled:opacity-70"
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
                  {payoutError && (
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                      {payoutError}
                    </p>
                  )}

                  {showClaimForm && (
                    <>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-1">
                          <label className="block text-xs font-medium text-emerald-900 dark:text-emerald-100">
                            Name
                          </label>
                          <input
                            value={contactName}
                            onChange={(e) => setContactName(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-emerald-200 focus:ring dark:border-emerald-900/50 dark:bg-zinc-950 dark:text-zinc-100"
                            placeholder="Full name"
                          />
                        </div>

                        <div className="sm:col-span-1">
                          <label className="block text-xs font-medium text-emerald-900 dark:text-emerald-100">
                            Email
                          </label>
                          <input
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-emerald-200 focus:ring dark:border-emerald-900/50 dark:bg-zinc-950 dark:text-zinc-100"
                            placeholder="you@example.com"
                          />
                        </div>
                      </div>

                      {payoutMethod === "venmo" ? (
                        <div className="mt-3">
                          <label className="block text-xs font-medium text-emerald-900 dark:text-emerald-100">
                            Venmo handle
                          </label>
                          <input
                            value={venmoHandle}
                            onChange={(e) => setVenmoHandle(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-emerald-200 focus:ring dark:border-emerald-900/50 dark:bg-zinc-950 dark:text-zinc-100"
                            placeholder="@username"
                          />
                        </div>
                      ) : null}

                      <div className="mt-4">
                        {payoutMethod === "venmo" ? (
                          <>
                            <p className="mb-3 text-xs text-emerald-800/90">
                              Venmo payouts are processed manually and can take
                              up to 3 hours. You will receive an email once the
                              payout is completed.
                            </p>

                            <form onSubmit={handleVenmoPayout}>
                              <button
                                type="submit"
                                disabled={payoutLoading}
                                className="inline-flex w-full items-center justify-center rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-emerald-50 shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                {payoutLoading
                                  ? "Submitting claim…"
                                  : "Submit Venmo details"}
                              </button>
                            </form>
                          </>
                        ) : (
                          <>
                            <p className="mb-3 text-xs text-emerald-800/90">
                              We&apos;ll connect to Stripe to securely set up a
                              bank payout. Enter your name and email, then
                              we&apos;ll take you to Stripe to add your bank
                              details. {BANK_PAYOUT_NOTICE}
                            </p>

                            <form onSubmit={handleStripePayout}>
                              <button
                                type="submit"
                                disabled={payoutLoading}
                                className="inline-flex w-full items-center justify-center rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-emerald-50 shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                {payoutLoading
                                  ? "Starting secure bank setup…"
                                  : "Continue with Stripe"}
                              </button>
                            </form>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
            <p>
              Need help? Email{" "}
              <a
                className="underline"
                href="mailto:support@giftlink.cards"
              >
                support@giftlink.cards
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
