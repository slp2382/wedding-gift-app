"use client";

import { FormEvent, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "../lib/supabaseClient";

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

  function generateCardId() {
    const randomPart = Math.random().toString(36).slice(2, 10);
    return `card_${randomPart}`;
  }

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

    const cardId = generateCardId();
    const baseUrl =
      typeof window !== "undefined" ? window.location.origin : "";
    const cardUrl = `${baseUrl}/card/${cardId}`;

    setLoading(true);

    const { error } = await supabase.from("cards").insert([
      {
        card_id: cardId,
        giver_name: giverName.trim(),
        amount: numericAmount,
        note: note.trim() || null,
      },
    ]);

    setLoading(false);

    if (error) {
      console.error(error);
      setErrorMessage("Something went wrong while saving the card.");
      return;
    }

    setPreview({
      cardId,
      giverName: giverName.trim(),
      amount: numericAmount,
      note: note.trim(),
      url: cardUrl,
    });
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

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex items-center justify-center px-4 dark:bg-zinc-950 dark:text-zinc-50">
      <main className="w-full max-w-2xl space-y-10">
        {/* Header */}
        <header className="space-y-3 text-center">
          <p className="text-xs font-medium tracking-wide text-indigo-500 uppercase dark:text-indigo-300">
            Early concept
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            Wedding cards that carry cash with a scan
          </h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400">
            Buy a physical card, scan one code to load a gift, and the couple
            scans the same code at the wedding to move the money to their bank.
          </p>
        </header>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Form */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold tracking-tight">
              Load a gift
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              This creates a gift card and a QR code. No real payments yet, just
              a working prototype.
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
          </section>

          {/* Preview */}
          <section className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/60 p-6 text-center shadow-sm dark:border-indigo-900 dark:bg-indigo-950/40">
            <h2 className="text-lg font-semibold tracking-tight">
              QR preview
            </h2>
            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
              The card you buy in the store prints this QR code on the inside.
            </p>

            <div className="mt-4 flex flex-col items-center gap-4">
              {preview ? (
                <>
                  <div className="rounded-2xl bg-white p-4 shadow-md dark:bg-zinc-900">
                    <QRCodeCanvas
                      value={preview.url}
                      size={180}
                      includeMargin
                    />
                  </div>
                  <div className="space-y-1 text-sm text-zinc-700 dark:text-zinc-200">
                    <p>
                      For{" "}
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
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 break-all">
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
                  Fill out the form and create a card to see the QR code here.
                </p>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
