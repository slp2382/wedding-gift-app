"use client";

import { useState } from "react";
import Link from "next/link";

type CardPageProps = {
  params: { cardId: string };
  searchParams: {
    giverName?: string;
    amount?: string;
    note?: string;
  };
};

export default function CardPage({ params, searchParams }: CardPageProps) {
  const { cardId } = params;

  const giverName = searchParams.giverName || "A generous guest";
  const amount = searchParams.amount || "0";
  const note = searchParams.note || "";

  const [isClaimed, setIsClaimed] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  function handleClaim() {
    // Simulated claim flow, no database yet
    setIsClaiming(true);
    setTimeout(() => {
      setIsClaiming(false);
      setIsClaimed(true);
    }, 800);
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 px-4 py-10 flex items-center justify-center dark:bg-zinc-950 dark:text-zinc-50">
      <main className="w-full max-w-xl space-y-8">
        {/* Header */}
        <header className="space-y-2 text-center">
          <p className="text-xs font-medium tracking-wide text-indigo-500 uppercase dark:text-indigo-300">
            Wedding Gift Card
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Gift for the happy couple
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Card ID {cardId}
          </p>
        </header>

        {/* Card content */}
        <section
          className={`rounded-2xl border p-6 shadow-sm transition transform ${
            isClaimed
              ? "border-emerald-400 bg-emerald-50/60 dark:border-emerald-500 dark:bg-emerald-950/40"
              : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  From
                </p>
                <p className="text-lg font-semibold">{giverName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Amount
                </p>
                <p className="text-2xl font-bold tracking-tight">
                  {Number(amount).toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                  })}
                </p>
              </div>
            </div>

            {note && (
              <div className="mt-2 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-100">
                “{note}”
              </div>
            )}

            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
              {!isClaimed ? (
                <>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    When you tap claim, this gift is marked as received for this
                    card. In a later version, this will also transfer the funds.
                  </p>
                  <button
                    onClick={handleClaim}
                    disabled={isClaiming}
                    className="inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium shadow-sm transition focus-visible:outline-none focus-visible:ring focus-visible:ring-indigo-500/60 disabled:cursor-not-allowed disabled:opacity-70 bg-indigo-600 text-white hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                  >
                    {isClaiming ? "Claiming gift…" : "Claim gift"}
                  </button>
                </>
              ) : (
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.25)]" />
                    <span className="font-medium text-emerald-700 dark:text-emerald-300">
                      Gift claimed
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                    Confirmation saved for this session.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Back link */}
        <div className="flex justify-center">
          <Link
            href="/"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 underline-offset-4 hover:underline dark:text-indigo-300 dark:hover:text-indigo-200"
          >
            Back to load a card
          </Link>
        </div>
      </main>
    </div>
  );
}
