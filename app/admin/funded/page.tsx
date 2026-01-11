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

type PayoutMini = {
  id: string;
  status: string;
  created_at: string;
};

export default function AdminFundedUnpaidPage() {
  const [loading, setLoading] = useState(true);
  const [adminError, setAdminError] = useState<string | null>(null);

  const [cards, setCards] = useState<CardRow[]>([]);
  const [payoutsById, setPayoutsById] = useState<Record<string, PayoutMini>>({});

  useEffect(() => {
    async function loadFundedUnpaid() {
      setLoading(true);
      setAdminError(null);

      // 1) Load funded cards
      const { data: cardRows, error: cardError } = await supabase
        .from("cards")
        .select(
          "id, card_id, giver_name, amount, note, created_at, funded, claimed, claimed_at, claimed_via, payout_request_id",
        )
        .eq("funded", true)
        .order("created_at", { ascending: false });

      if (cardError) {
        console.error("Error loading funded cards:", cardError);
        setAdminError(
          cardError.message || "Could not load funded cards. Check Supabase.",
        );
        setLoading(false);
        return;
      }

      const fundedCards = (cardRows || []) as CardRow[];

      // 2) Load payout requests referenced by these cards
      const payoutIds = Array.from(
        new Set(
          fundedCards
            .map((c) => c.payout_request_id)
            .filter((id): id is string => Boolean(id)),
        ),
      );

      let payoutMap: Record<string, PayoutMini> = {};
      if (payoutIds.length > 0) {
        const { data: payoutRows, error: payoutError } = await supabase
          .from("payout_requests")
          .select("id, status, created_at")
          .in("id", payoutIds);

        if (payoutError) {
          console.error("Error loading payout requests:", payoutError);
          setAdminError(
            payoutError.message ||
              "Could not load payout requests for funded cards.",
          );
          setLoading(false);
          return;
        }

        (payoutRows || []).forEach((row) => {
          const p = row as PayoutMini;
          payoutMap[p.id] = p;
        });
      }

      // 3) Keep only cards not fully paid out
      const unpaid = fundedCards.filter((c) => {
        if (!c.payout_request_id) return true;
        const p = payoutMap[c.payout_request_id];
        if (!p) return true;
        return (p.status || "").toLowerCase() !== "paid";
      });

      setCards(unpaid);
      setPayoutsById(payoutMap);
      setLoading(false);
    }

    loadFundedUnpaid();
  }, []);

  const totalAmount = useMemo(() => {
    return cards.reduce((sum, c) => sum + (typeof c.amount === "number" ? c.amount : 0), 0);
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
              <p className="text-xs text-slate-400">Internal admin · Funded</p>
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
            <h1 className="text-2xl font-semibold tracking-tight">
              Funded cards not paid out
            </h1>
            <p className="text-sm text-slate-400">
              Shows cards that have funds loaded but are not fully paid out yet.
              This includes cards with no payout request and cards whose payout request is not marked paid.
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
              <p className="font-medium">No funded unpaid cards 🎉</p>
              <p className="mt-1 text-xs text-slate-400">
                When someone loads a gift, it will appear here until it is paid out.
              </p>
            </section>
          )}

          {!loading && !adminError && cards.length > 0 && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-100 shadow-lg shadow-slate-900/80">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-400">
                  Showing {cards.length} funded{" "}
                  {cards.length === 1 ? "card" : "cards"} not paid out.
                </p>
                <p className="text-xs text-slate-300">
                  Total amount: <span className="font-semibold text-slate-100">{formattedTotal}</span>
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
                      <th className="px-2 py-2 text-left">Claimed</th>
                      <th className="px-2 py-2 text-left">Payout status</th>
                      <th className="px-2 py-2 text-left">Payout request</th>
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

                      const claimedStr = c.claimed
                        ? c.claimed_at
                          ? new Date(c.claimed_at).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Yes"
                        : "No";

                      const payout = c.payout_request_id
                        ? payoutsById[c.payout_request_id]
                        : null;

                      const payoutStatus = !c.payout_request_id
                        ? "No request"
                        : payout
                        ? payout.status
                        : "Unknown";

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

                          <td className="px-2 py-2 align-top text-slate-100">
                            <div className="flex flex-col gap-0.5">
                              <span>{claimedStr}</span>
                              {c.claimed_via && (
                                <span className="text-[10px] text-slate-400">
                                  via {c.claimed_via}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-2 py-2 align-top text-slate-100">
                            {payoutStatus}
                          </td>

                          <td className="px-2 py-2 align-top font-mono text-[11px] text-slate-300">
                            {c.payout_request_id ? c.payout_request_id : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="mt-3 text-[11px] text-slate-400">
                Tip: If you want this page to exclude cards that are claimed but not yet requested, add a filter for claimed true and payout_request_id not set.
              </p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
