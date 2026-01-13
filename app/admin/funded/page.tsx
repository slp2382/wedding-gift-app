// app/admin/funded/page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

type CardRow = {
  id: string;
  card_id: string;
  giver_name: string | null;
  amount: number | null;
  note: string | null;
  created_at: string;
  funded: boolean;
  claimed: boolean;
  claimed_at: string | null;
  claimed_via: string | null;
  payout_request_id: string | null;
};

export default function AdminFundedUnclaimedPage() {
  const [loading, setLoading] = useState(true);
  const [adminError, setAdminError] = useState<string | null>(null);

  const [cards, setCards] = useState<CardRow[]>([]);

  useEffect(() => {
    async function loadFundedUnclaimed() {
      setLoading(true);
      setAdminError(null);

      // Load only funded cards that are still unclaimed
      const { data: cardRows, error: cardError } = await supabase
        .from("cards")
        .select("id, card_id, giver_name, amount, note, created_at, funded, claimed")
        .eq("funded", true)
        .eq("claimed", false)
        .order("created_at", { ascending: false });

      if (cardError) {
        console.error("Error loading funded unclaimed cards:", cardError);
        setAdminError(
          cardError.message || "Could not load funded unclaimed cards. Check Supabase.",
        );
        setLoading(false);
        return;
      }

      const rows = (cardRows || []) as CardRow[];
      setCards(rows);
      setLoading(false);
    }

    loadFundedUnclaimed();
  }, []);

  const totalAmount = useMemo(() => {
    return cards.reduce(
      (sum, c) => sum + (typeof c.amount === "number" ? c.amount : 0),
      0,
    );
  }, [cards]);

  const formattedTotal = useMemo(() => {
    return totalAmount.toLocaleString("en-US", { style: "currency", currency: "USD" });
  }, [totalAmount]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-6 text-slate-50">
      <div className="mx-auto flex min-h-[90vh] max-w-5xl flex-col">
        {/* Top nav */}
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-400 to-emerald-400 shadow-md shadow-indigo-500/30">
              <span className="text-lg font-semibold text-white">G</span>
            </div>
            <div className="leading-tight">
              <p className="text-lg font-semibold tracking-tight">GiftLink</p>
              <p className="text-xs text-slate-400">Internal admin · Funded balance</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-xs font-medium text-slate-300 underline-offset-4 hover:text-slate-100 hover:underline"
            >
              Admin home
            </Link>
            <Link
              href="/"
              className="text-xs font-medium text-indigo-300 underline-offset-4 hover:text-indigo-200 hover:underline"
            >
              View public site
            </Link>
          </div>
        </header>

        <main className="flex-1 space-y-6">
          <section className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Funded unclaimed balance</h1>
            <p className="text-sm text-slate-400">
              Shows funded cards that have not been claimed yet. This total represents the gift
              balance you should keep available. Once a card is claimed, it is removed from this
              list.
            </p>
          </section>

          {loading && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-200 shadow-lg shadow-slate-900/80">
              Loading funded cards…
            </section>
          )}

          {!loading && adminError && (
            <section className="rounded-2xl border border-rose-800 bg-rose-950/40 p-6 text-sm text-rose-100 shadow-lg shadow-rose-900/60">
              <p className="font-medium">Error</p>
              <p className="mt-1 text-xs text-rose-200/90">{adminError}</p>
            </section>
          )}

          {!loading && !adminError && cards.length === 0 && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-200 shadow-lg shadow-slate-900/80">
              <p className="font-medium">No funded unclaimed cards</p>
              <p className="mt-1 text-xs text-slate-400">
                When someone loads a gift, it will appear here until the recipient claims it.
              </p>
            </section>
          )}

          {!loading && !adminError && cards.length > 0 && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-100 shadow-lg shadow-slate-900/80">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-400">
                  Showing {cards.length} funded {cards.length === 1 ? "card" : "cards"} not yet
                  claimed.
                </p>
                <p className="text-xs text-slate-300">
                  Total amount:{" "}
                  <span className="font-semibold text-slate-100">{formattedTotal}</span>
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
                      <th className="px-2 py-2 text-left">Card</th>
                      <th className="px-2 py-2 text-left">Amount</th>
                      <th className="px-2 py-2 text-left">Giver</th>
                      <th className="px-2 py-2 text-left">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cards.map((c) => {
                      const amt =
                        typeof c.amount === "number" && c.amount > 0
                          ? c.amount.toLocaleString("en-US", {
                              style: "currency",
                              currency: "USD",
                            })
                          : "—";

                      const created = new Date(c.created_at);
                      const createdStr = created.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <tr
                          key={c.id}
                          className="border-b border-slate-800/80 last:border-none"
                        >
                          <td className="px-2 py-2 align-top font-mono text-[11px] text-slate-300">
                            <div className="flex flex-col gap-0.5">
                              <span>{c.card_id}</span>
                              <Link
                                href={`/card/${c.card_id}`}
                                className="text-[10px] text-indigo-300 underline-offset-2 hover:text-indigo-200 hover:underline"
                                target="_blank"
                              >
                                View card
                              </Link>
                            </div>
                          </td>

                          <td className="px-2 py-2 align-top text-slate-100">{amt}</td>

                          <td className="px-2 py-2 align-top text-slate-100">
                            {c.giver_name || "—"}
                          </td>

                          <td className="px-2 py-2 align-top text-slate-300">{createdStr}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="mt-3 text-[11px] text-slate-400">
                Tip: This page intentionally excludes claimed cards. Use the payouts page for Venmo
                requests.
              </p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
