"use client";

import { FormEvent, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

type PreviewState = {
  cardId: string;
  giverName: string;
  amount: number;
  note: string;
  url: string;
};

export default function Home() {
  const [giverName, setGiverName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);

    const numericAmount = parseFloat(amount);
    if (!giverName.trim()) {
      setErrorMessage("Please enter a name.");
      return;
    }
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMessage("Please enter a valid amount.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/create-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          giverName: giverName.trim(),
          amount: numericAmount,
          note: note.trim() || null,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        const message =
          (result && result.error) ||
          "Something went wrong while creating the card.";
        setErrorMessage(message);
        setLoading(false);
        return;
      }

      const result = await response.json();
      const cardId: string = result.cardId;

      const baseUrl =
        typeof window !== "undefined" ? window.location.origin : "";
      const cardUrl = `${baseUrl}/card/${cardId}`;

      setPreview({
        cardId,
        giverName: giverName.trim(),
        amount: numericAmount,
        note: note.trim(),
        url: cardUrl,
      });
    } catch (error) {
      console.error("Error calling /api/create-card:", error);
      setErrorMessage("Something went wrong while creating the card.");
    }

    setLoading(false);
  }

  async function handleCopyLink() {
    if (!preview?.url) return;
    try {
      await navigator.clipboard.writeText(preview.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleStripeCheckoutTest() {
    if (!preview) return;
    setStripeLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/load-gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: preview.cardId,
          amount: preview.amount,
          giverName: preview.giverName,
          note: preview.note || "",
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.checkoutUrl) {
        const message =
          (result && result.error) ||
          "Unable to start Stripe test checkout.";
        setErrorMessage(message);
        setStripeLoading(false);
        return;
      }

      // Redirect to Stripe test checkout
      window.location.href = result.checkoutUrl;
    } catch (error) {
      console.error("Error calling /api/load-gift:", error);
      setErrorMessage("Something went wrong starting Stripe checkout.");
    }

    setStripeLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-indigo-50/60 to-zinc-50 text-zinc-900 px-4 py-6 dark:from-zinc-950 dark:via-slate-950 dark:to-zinc-950 dark:text-zinc-50">
      <div className="mx-auto flex min-h-[90vh] max-w-5xl flex-col">
        {/* Top nav with wordmark */}
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

          <div className="hidden text-xs font-medium text-zinc-500 md:block dark:text-zinc-400">
            <span className="rounded-full border border-zinc-200/80 bg-white/60 px-3 py-1 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60">
              Early prototype · Demo only
            </span>
          </div>
        </header>

        {/* Main content */}
        <main className="grid flex-1 items-center gap-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <section className="space-y-8">
            {/* Hero text with decorative line */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/70 bg-sky-50/80 px-3 py-1 text-xs font-medium text-sky-700 shadow-sm backdrop-blur dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
                <span className="h-1 w-1 rounded-full bg-emerald-400" />
                <span>For couples who prefer links to loose envelopes</span>
              </div>

              <div className="space-y-3">
                <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
                  Gift money with a{" "}
                  <span className="bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 bg-clip-text text-transparent">
                    single scan
                  </span>
                </h1>
                <p className="text-sm text-zinc-600 md:text-base dark:text-zinc-400">
                  GiftLink turns a regular wedding card into a smart one. Guests
                  scan once to load a gift; the couple scans the same code at
                  the wedding to claim it. No real payments yet—just a working
                  concept.
                </p>
              </div>

              {/* Decorative line */}
              <div className="flex items-center justify-start gap-3">
                <div className="h-px w-24 bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400" />
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  How it works
                </p>
              </div>
            </div>

            {/* Form card */}
            <section className="mt-4 rounded-2xl border border-zinc-200/80 bg-white/80 p-6 shadow-lg shadow-indigo-100/60 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-none">
              <h2 className="text-lg font-semibold tracking-tight">
                Load a gift for this card
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Imagine this QR printed inside a wedding card at the store. Fill
                this out as the guest, and the couple uses the same code to
                claim it later.
              </p>

              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="giverName">
                    Your name
                  </label>
                  <input
                    id="giverName"
                    type="text"
                    value={giverName}
                    onChange={(event) => setGiverName(event.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-indigo-500/50 placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
                    placeholder="Scott Porter"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="amount">
                    Amount
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-500">
                      $
                    </span>
                    <input
                      id="amount"
                      type="number"
                      min={1}
                      step="0.01"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-white px-7 py-2 text-sm shadow-sm outline-none ring-indigo-500/50 placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
                      placeholder="100"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="note">
                    Optional note
                  </label>
                  <textarea
                    id="note"
                    rows={3}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-indigo-500/50 placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
                    placeholder="We are so happy for you both."
                  />
                </div>

                {errorMessage && (
                  <p className="text-sm text-rose-600 dark:text-rose-400">
                    {errorMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring focus-visible:ring-indigo-500/70 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                >
                  {loading ? "Creating card…" : "Create card and QR"}
                </button>
              </form>

              {preview && (
                <button
                  type="button"
                  onClick={handleStripeCheckoutTest}
                  disabled={stripeLoading}
                  className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-indigo-300 bg-white px-4 py-2.5 text-xs font-medium text-indigo-700 shadow-sm transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring focus-visible:ring-indigo-500/70 disabled:cursor-not-allowed disabled:opacity-70 dark:border-indigo-700 dark:bg-zinc-900 dark:text-indigo-200 dark:hover:bg-zinc-800"
                >
                  {stripeLoading
                    ? "Opening Stripe test checkout…"
                    : "Open Stripe test checkout for this gift"}
                </button>
              )}
            </section>
          </section>

          {/* QR preview card */}
          <section className="mt-6 md:mt-0">
            <div className="rounded-2xl border border-sky-100/80 bg-sky-50/70 p-6 text-center shadow-lg shadow-sky-100/70 backdrop-blur dark:border-sky-900 dark:bg-sky-950/40 dark:shadow-none">
              <h2 className="text-lg font-semibold tracking-tight">
                QR preview
              </h2>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                This is what would be printed inside the physical card. Couples
                scan this at the wedding to see and claim the gift.
              </p>

              <div className="mt-5 flex flex-col items-center gap-4">
                {preview ? (
                  <>
                    <div className="rounded-3xl border border-white/70 bg-white p-4 shadow-md shadow-indigo-100/80 dark:border-zinc-800 dark:bg-zinc-900">
                      <QRCodeCanvas
                        value={preview.url}
                        size={180}
                        includeMargin
                      />
                    </div>
                    <div className="space-y-1 text-sm text-zinc-700 dark:text-zinc-200">
                      <p>
                        From{" "}
                        <span className="font-semibold">
                          {preview.giverName}
                        </span>{" "}
                        ·{" "}
                        <span className="font-semibold">
                          {preview.amount.toLocaleString("en-US", {
                            style: "currency",
                            currency: "USD",
                          })}
                        </span>
                      </p>
                      {preview.note && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                          “{preview.note}”
                        </p>
                      )}
                      <p className="break-all text-xs text-zinc-500 dark:text-zinc-400">
                        Link {preview.url}
                      </p>
                    </div>
                    <button
                      onClick={handleCopyLink}
                      className="inline-flex items-center justify-center rounded-full border border-indigo-300 bg-white px-4 py-2 text-xs font-medium text-indigo-700 shadow-sm transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring focus-visible:ring-indigo-500/60 dark:border-indigo-700 dark:bg-zinc-900 dark:text-indigo-200 dark:hover:bg-zinc-800"
                    >
                      {copied ? "Link copied" : "Copy link to share"}
                    </button>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
                    Fill out the form and create a card to see the QR code and
                    shareable link here.
                  </p>
                )}
              </div>
            </div>
          </section>
        </main>

        {/* Tiny footer note */}
        <footer className="mt-6 flex justify-center">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-500">
            GiftLink is an experiment prototype. No real money moves yet—just a
            glimpse of the future wedding card.
          </p>
        </footer>
      </div>
    </div>
  );
}
