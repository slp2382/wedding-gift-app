"use client";

import { useState, FormEvent } from "react";
import QRCode from "qrcode.react"; // ✅ Correct import

export default function Home() {
  const [giverName, setGiverName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<null | {
    giverName: string;
    amount: string;
    note: string;
    cardId: string;
  }>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!giverName || !amount) {
      alert("Please enter your name and a gift amount");
      return;
    }

    // Create a simple fake card ID (timestamp + random)
    const cardId = `card_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    setPreview({
      giverName,
      amount,
      note,
      cardId,
    });
  }

  const qrUrl =
    preview &&
    `https://wedding-gift-app.vercel.app/card/${encodeURIComponent(
      preview.cardId
    )}`;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex items-center justify-center px-4 dark:bg-zinc-950 dark:text-zinc-50">
      <main className="w-full max-w-2xl space-y-10">
        {/* Header */}
        <header className="space-y-3">
          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
            Early concept
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            Wedding cards that carry cash with a simple scan
          </h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400">
            Buy a physical card, scan one code to load a gift, and the couple
            scans the same code at the wedding to move the money to their bank.
            No more last minute trips to the bank machine.
          </p>
        </header>

        {/* How it works */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">How it works</h2>
          <ol className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
            <li>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium mr-2">
                1
              </span>
              You buy a card in a store and scan the code inside.
            </li>
            <li>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium mr-2">
                2
              </span>
              Our site lets you pick an amount and load your gift securely.
            </li>
            <li>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium mr-2">
                3
              </span>
              The couple scans the same code and sends the funds to their bank.
            </li>
          </ol>
        </section>

        {/* Load gift form */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Try the load gift flow</h2>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            This is a demo form. In the real product, this step would create a
            secure session tied to the card code.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="giverName">
                Your name
              </label>
              <input
                id="giverName"
                type="text"
                value={giverName}
                onChange={(e) => setGiverName(e.target.value)}
                placeholder="Alex Guest"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="amount">
                Gift amount
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500">$</span>
                <input
                  id="amount"
                  type="number"
                  min={1}
                  step={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="note">
                Message on the card optional
              </label>
              <textarea
                id="note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="So happy for you both..."
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition"
            >
              Preview card load
            </button>
          </form>

          {preview && (
            <div className="mt-6 space-y-4 rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div>
                <p className="text-xs font-semibold text-zinc-500 mb-1">
                  Demo preview
                </p>
                <p>
                  <span className="font-medium">{preview.giverName}</span> is
                  loading{" "}
                  <span className="font-medium">
                    ${Number(preview.amount || 0).toFixed(2)}
                  </span>{" "}
                  onto this card.
                </p>
                {preview.note && (
                  <p className="mt-2 text-zinc-600 dark:text-zinc-300">
                    Message on card: {preview.note}
                  </p>
                )}
                <p className="mt-2 text-xs text-zinc-500">
                  In a real build, this step would redirect to payment.
                </p>
              </div>

              {qrUrl && (
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 mb-1">
                      Demo QR code for this card
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-xs">
                      In a real product, this code would be printed inside the
                      physical card and scanned by the guest and by the couple.
                    </p>
                    {/* Debug line to verify URL */}
                    <p className="mt-1 text-[10px] text-zinc-500">
                      Debug QR URL: {qrUrl}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950">
                    <QRCode value={qrUrl} size={120} />
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
          Built as a first draft using Next and Tailwind. All data here is test
          only.
        </footer>
      </main>
    </div>
  );
}
