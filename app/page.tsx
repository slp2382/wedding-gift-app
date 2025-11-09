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
      // ✅ Send the data your /api/create-card route expects
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

        {/* Hero */}
        <main className="space-y-24 pb-16">
          {/* ... rest of your JSX stays exactly as you pasted ... */}
          {/* (Hero, How it works, CTAs, DIY section, QR column, footer) */}
          {/* I’m not changing any of that structure. */}
          {/* --- paste your existing JSX from your message here unchanged --- */}
          {/* I’ll keep it here to preserve your full page: */}

          <section className="grid gap-10 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:items-center">
            <div className="space-y-5">
              <p className="inline-flex items-center rounded-full border border-indigo-200/80 bg-white/70 px-3 py-1 text-xs font-medium text-indigo-600 shadow-sm backdrop-blur dark:border-indigo-500/40 dark:bg-indigo-950/40 dark:text-indigo-300">
                New · Cashless wedding gifts
              </p>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Physical wedding cards with{" "}
                <span className="bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 bg-clip-text text-transparent">
                  scannable gift links
                </span>
                .
              </h1>
              <p className="max-w-xl text-sm text-zinc-600 dark:text-zinc-300">
                GiftLink turns a simple card into a QR-powered gift. Guests scan
                a card, load a monetary gift through Stripe, and the couple
                scans the same card to claim their funds later — no envelopes,
                no loose cash.
              </p>

              <div className="flex flex-wrap gap-3">
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring focus-visible:ring-indigo-500/60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                >
                  How GiftLink works
                </a>
                <a
                  href="#diy"
                  className="inline-flex items-center justify-center rounded-full border border-zinc-200/80 bg-white/70 px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring focus-visible:ring-indigo-500/40 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100 dark:hover:bg-zinc-900"
                >
                  Create your own QR card
                </a>
              </div>

              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Couples keep the gift amount. Guests cover a small service fee.
                Payments are handled securely by Stripe.
              </p>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute -inset-6 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-sky-400/10 to-emerald-400/10 blur-2xl dark:from-indigo-500/15 dark:via-sky-400/15 dark:to-emerald-400/15" />
              <div className="relative rounded-3xl border border-zinc-200/80 bg-white/80 p-5 shadow-xl shadow-indigo-100/60 backdrop-blur-sm dark:border-zinc-800/70 dark:bg-zinc-950/80 dark:shadow-none">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  A GiftLink card
                </p>
                <div className="flex items-center gap-5">
                  <div className="flex-1 space-y-2">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Front
                    </p>
                    <div className="flex h-32 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-400 text-sm font-semibold text-white shadow-md shadow-indigo-500/40">
                      “Scan me to send a gift”
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Guests scan the code on the card to send their gift.
                    </p>
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Back
                    </p>
                    <div className="flex h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 text-[11px] text-zinc-500 dark:border-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-300">
                      <span>QR code with unique link</span>
                      <span className="mt-1 font-mono text-[10px] text-zinc-400">
                        giftlink.cards/card/...
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Couples scan the same card to see and claim each gift.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* How it works */}
          <section id="how-it-works" className="space-y-6">
            <div className="space-y-2 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-300">
                How it works
              </p>
              <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
                Three simple steps on one little card
              </h2>
              <p className="mx-auto max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">
                Every GiftLink card carries a unique QR code. Guests and couples
                both use that same code — one to load gifts, the other to claim
                them.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-zinc-200/80 bg-white/80 p-4 text-sm shadow-sm dark:border-zinc-800/70 dark:bg-zinc-950/80">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  1 · At the shop or online
                </p>
                <h3 className="text-sm font-semibold">Buy GiftLink cards</h3>
                <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
                  Couples or guests pick up physical GiftLink cards from a
                  partner shop or order packs online. Each card already has its
                  own unique QR link.
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200/80 bg-white/80 p-4 text-sm shadow-sm dark:border-zinc-800/70 dark:bg-zinc-950/80">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  2 · Guest scans to load
                </p>
                <h3 className="text-sm font-semibold">Guests send their gift</h3>
                <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
                  Guests scan the card&apos;s QR, enter their name, amount and
                  note, and pay through Stripe. The couple&apos;s card instantly
                  reflects that gift as &quot;ready to claim.&quot;
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200/80 bg-white/80 p-4 text-sm shadow-sm dark:border-zinc-800/70 dark:bg-zinc-950/80">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  3 · Couple scans to claim
                </p>
                <h3 className="text-sm font-semibold">Couple claims funds</h3>
                <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
                  The couple scans their stack of cards to see who sent what,
                  then submits their payout details to receive the total later
                  via Venmo or bank transfer (in a future version, fully
                  automated).
                </p>
              </div>
            </div>
          </section>

          {/* CTAs for cards & locations */}
          <section className="space-y-4 rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-lg shadow-indigo-100/60 dark:border-zinc-800 dark:bg-zinc-950/80 dark:shadow-none">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-300">
                  For couples & shops
                </p>
                <h2 className="text-lg font-semibold tracking-tight">
                  Ready to put GiftLink in the real world?
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  We&apos;re rolling out physical GiftLink cards with select
                  shops. You can also order cards directly, or use the DIY
                  option below to print your own.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="#"
                  className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring focus-visible:ring-indigo-500/60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                >
                  Order GiftLink card packs
                </Link>
                <Link
                  href="#"
                  className="inline-flex items-center justify-center rounded-full border border-zinc-200/80 bg-white/70 px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring focus-visible:ring-indigo-500/40 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100 dark:hover:bg-zinc-900"
                >
                  Find retail locations
                </Link>
              </div>
            </div>
          </section>

          {/* DIY GiftLink section */}
          <section
            id="diy"
            className="space-y-5 rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-lg shadow-indigo-100/60 dark:border-zinc-800 dark:bg-zinc-950/80 dark:shadow-none"
          >
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-300">
                DIY option
              </p>
              <h2 className="text-lg font-semibold tracking-tight">
                Create your own GiftLink and print the QR code
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                If you don&apos;t have printed GiftLink cards yet, you can
                create a one-off GiftLink here, print or save the QR code, and
                place it on your own card or wedding signage. After you create
                the link, you can load it with a gift using secure checkout.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-start">
              {/* Form */}
              <form
                onSubmit={handleCreateCard}
                className="space-y-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-4 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      Your name
                    </label>
                    <input
                      type="text"
                      value={giverName}
                      onChange={(e) => setGiverName(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                      placeholder="Name to show on the card"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      Gift amount
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                        $
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full rounded-xl border border-zinc-200 bg-white pl-6 pr-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                        placeholder="150"
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
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                    placeholder="Add a short message for the couple"
                  />
                </div>

                {createError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">
                    {createError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex w-full items-center justify-center rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring focus-visible:ring-indigo-500/60 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                >
                  {creating
                    ? "Creating GiftLink…"
                    : "Create GiftLink & show QR"}
                </button>

                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  After you create the link, you&apos;ll see a QR code that you
                  can print or save, plus an option to load it with your gift
                  right away via Stripe.
                </p>
              </form>

              {/* QR + checkout column */}
              <div className="space-y-3 rounded-2xl border border-zinc-200/80 bg-white/80 p-4 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
                {!createdCardId || !createdCardUrl ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
                    <p>Fill out the form and create a GiftLink to see its QR.</p>
                    <p className="text-[11px]">
                      You&apos;ll be able to print it or include it in your own
                      card design.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      Your GiftLink
                    </p>
                    <div className="flex flex-col items-center gap-3">
                      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-950">
                        <QRCode value={createdCardUrl} size={128} />
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        URL:
                        <br />
                        <span className="break-all font-mono text-[11px] text-zinc-700 dark:text-zinc-200">
                          {createdCardUrl}
                        </span>
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard
                            .writeText(createdCardUrl)
                            .catch(() => {});
                        }}
                        className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
                      >
                        Copy link
                      </button>
                    </div>

                    <div className="mt-4 space-y-2 border-t border-zinc-200 pt-3 text-xs dark:border-zinc-700">
                      <p className="text-zinc-500 dark:text-zinc-400">
                        When you&apos;re ready, you can load this GiftLink with
                        your gift amount using secure Stripe checkout. The
                        couple&apos;s card will then show the gift as
                        &quot;ready to claim.&quot;
                      </p>

                      {checkoutError && (
                        <p className="text-xs text-rose-600 dark:text-rose-400">
                          {checkoutError}
                        </p>
                      )}

                      <button
                        type="button"
                        disabled={checkoutLoading}
                        onClick={handleOpenCheckout}
                        className="inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring focus-visible:ring-emerald-500/60 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                      >
                        {checkoutLoading
                          ? "Opening secure checkout…"
                          : "Load this card via Stripe"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="mt-6 border-t border-zinc-200/80 pt-4 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>© {new Date().getFullYear()} GiftLink. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="#" className="hover:underline">
                Terms
              </Link>
              <Link href="#" className="hover:underline">
                Privacy
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
