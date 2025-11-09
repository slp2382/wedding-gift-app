"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import QRCode from "react-qr-code";

type CreateCardResponse = {
  cardId?: string;
  card_id?: string;
  error?: string;
};

export default function HomePage() {
  const [giverName, setGiverName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [createdCardId, setCreatedCardId] = useState<string | null>(null);
  const [createdCardUrl, setCreatedCardUrl] = useState<string | null>(null);

  async function handleCreateCard(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError(null);
    setCheckoutError(null);
    setCreatedCardId(null);
    setCreatedCardUrl(null);

    const trimmedName = giverName.trim();
    const amountNumber = Number(amount);

    if (!trimmedName) {
      setCreateError("Please enter your name.");
      return;
    }

    if (!amountNumber || amountNumber <= 0) {
      setCreateError("Please enter a gift amount greater than zero.");
      return;
    }

    setCreating(true);

    try {
      // ✅ send the data your /api/create-card route expects
      const createRes = await fetch("/api/create-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          giverName: trimmedName,
          amount: amountNumber,
          note: note.trim() || null,
        }),
      });

      if (!createRes.ok) {
        const result = (await createRes.json().catch(() => null)) as
          | CreateCardResponse
          | null;
        const message =
          (result && result.error) ||
          "Could not create a new GiftLink card. Please try again.";
        setCreateError(message);
        setCreating(false);
        return;
      }

      const result = (await createRes.json()) as CreateCardResponse;
      const cardId = result.cardId || result.card_id;

      if (!cardId) {
        setCreateError(
          "The server did not return a card id. Please try again.",
        );
        setCreating(false);
        return;
      }

      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : "https://giftlink.cards";

      const url = `${origin}/card/${cardId}`;
      setCreatedCardId(cardId);
      setCreatedCardUrl(url);
    } catch (err) {
      console.error("Error creating card:", err);
      setCreateError("Something went wrong while creating your GiftLink.");
    }

    setCreating(false);
  }

  async function handleOpenCheckout() {
    if (!createdCardId) {
      setCheckoutError(
        "You need to create a GiftLink card before opening checkout.",
      );
      return;
    }

    const trimmedName = giverName.trim();
    const amountNumber = Number(amount);

    if (!trimmedName || !amountNumber || amountNumber <= 0) {
      setCheckoutError(
        "Your name and amount must be filled out before checkout.",
      );
      return;
    }

    setCheckoutError(null);
    setCheckoutLoading(true);

    try {
      const res = await fetch("/api/load-gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: createdCardId,
          giverName: trimmedName,
          amount: amountNumber,
          note: note.trim() || null,
        }),
      });

      if (!res.ok) {
        const result = await res.json().catch(() => null);
        const message =
          (result && result.error) ||
          "Could not start checkout. Please try again.";
        setCheckoutError(message);
        setCheckoutLoading(false);
        return;
      }

      const result = await res.json();
      const redirectUrl = result.url || result.checkoutUrl;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        setCheckoutError(
          "Checkout link was not returned. Please try again.",
        );
        setCheckoutLoading(false);
      }
    } catch (err) {
      console.error("Error opening Stripe checkout:", err);
      setCheckoutError(
        "Something went wrong while starting secure checkout.",
      );
      setCheckoutLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-indigo-50/60 to-zinc-50 text-zinc-900 dark:from-zinc-950 dark:via-slate-950 dark:to-zinc-950 dark:text-zinc-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Top nav / wordmark */}
        <header className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-400 to-emerald-400 shadow-md shadow-indigo-500/30 dark:shadow-indigo-700/40">
              <span className="text-lg font-semibold text-white">G</span>
            </div>
            <div className="leading-tight">
              <p className="text-lg font-semibold tracking-tight">GiftLink</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                QR-powered wedding gifts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="#diy"
              className="hidden rounded-full border border-indigo-500/70 px-3 py-1.5 text-xs font-medium text-indigo-600 underline-offset-4 hover:bg-indigo-50 hover:text-indigo-700 dark:border-indigo-400/70 dark:text-indigo-200 dark:hover:bg-indigo-900/40 md:inline-flex"
            >
              Create your own GiftLink
            </a>
          </div>
        </header>

        {/* Hero + sections... (unchanged from previous version) */}
        {/* --------------- REST OF THE FILE --------------- */}
        {/* For brevity here, keep everything below exactly as you already have it:
            - Hero
            - How it works
            - CTAs
            - DIY section wrapper
            - Footer
           Only the logic above (handleCreateCard + handleOpenCheckout) needed changes.
        */}
        {/* ...paste the rest of your existing JSX from the previous version here unchanged... */}
      </div>
    </div>
  );
}
