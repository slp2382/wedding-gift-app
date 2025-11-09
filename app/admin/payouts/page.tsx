"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

type PayoutRequest = {
  id: string;
  card_id: string;
  contact_name: string;
  contact_email: string;
  payout_method: string;
  payout_details: string;
  status: string;
  created_at: string;
};

type CardMini = {
  card_id: string;
  amount: number | null;
};

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [cardAmounts, setCardAmounts] = useState<Record<string, number | null>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadPendingPayouts() {
      setLoading(true);
      setAdminError(null);

      // 1) Get pending payout requests
      const { data: payoutRows, error: payoutError } = await supabase
        .from("payout_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (payoutError) {
        console.error("Error loading payout_requests:", payoutError);
        setAdminError(
          payoutError.message ||
            "Could not load payout requests. Check Supabase.",
        );
        setLoading(false);
        return;
      }

      const payoutsData = (payoutRows || []) as PayoutRequest[];
      setPayouts(payoutsData);

      // 2) Lookup related card amounts in a second query
      if (payoutsData.length > 0) {
        const cardIds = payoutsData.map((p) => p.card_id);

        const { data: cardRows, error: cardError } = await supabase
          .from("cards")
          .select("card_id, amount")
          .in("card_id", cardIds);

        if (cardError) {
          console.error("Error loading cards for payouts:", cardError);
          setAdminError(
            cardError.message ||
              "Could not load card amounts for payout requests.",
          );
          setLoading(false);
          return;
        }

        const map: Record<string, number | null> = {};
        (cardRows || []).forEach((row) => {
          const c = row as CardMini;
          map[c.card_id] = c.amount;
        });
        setCardAmounts(map);
      } else {
        setCardAmounts({});
      }

      setLoading(false);
    }

    loadPendingPayouts();
  }, []);

  async function handleMarkPaid(id: string) {
    setAdminError(null);
    setUpdatingId(id);

    try {
      const { error } = await supabase
        .from("payout_requests")
        .update({ status: "paid" })
        .eq("id", id);

      if (error) {
        console.error("Error marking payout as paid:", error);
        setAdminError(
          error.message ||
            "Could not update payout status. Check Supabase or logs.",
        );
        setUpdatingId(null);
        return;
      }

      // Remove from local list of pending payouts
      setPayouts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Unexpected error updating payout:", err);
      setAdminError("Unexpected error while updating payout status.");
    }

    setUpdatingId(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-6 text-slate-50">
      <div className="mx-auto flex min-h-[90vh] max-w-5xl flex-col">
        {/* Top nav / wordmark */}
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-400 to-emerald-400 shadow-md shadow-indigo-500/30">
              <span className="text-lg font-semibold text-white">G</span>
            </div>
            <div className="leading-tight">
              <p className="text-lg font-semibold tracking-tight">GiftLink</p>
              <p className="text-xs text-slate-400">
                Internal admin · Payouts
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="text-xs font-medium text-indigo-300 underline-offset-4 hover:text-indigo-200 hover:underline"
          >
            View public site
          </Link>
        </header>

        <main className="flex-1 space-y-6">
          <section className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Pending payout requests
            </h1>
            <p className="text-sm text-slate-400">
              This view is for internal use only. When you send a payout (e.g.
              via Venmo), click “Mark as paid” to update the status.
            </p>
          </section>

          {loading && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-200 shadow-lg shadow-slate-900/80">
              Loading pending payouts…
            </section>
          )}

          {!loading && adminError && (
            <section className="rounded-2xl border border-rose-800 bg-rose-950/40 p-6 text-sm text-rose-100 shadow-lg shadow-rose-900/60">
              <p className="font-medium">Error</p>
              <p className="mt-1 text-xs text-rose-200/90">{adminError}</p>
            </section>
          )}

          {!loading && !adminError && payouts.length === 0 && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-200 shadow-lg shadow-slate-900/80">
              <p className="font-medium">No pending payouts 🎉</p>
              <p className="mt-1 text-xs text-slate-400">
                When someone claims a funded card and submits their Venmo
                details, the request will appear here.
              </p>
            </section>
          )}

          {!loading && !adminError && payouts.length > 0 && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-100 shadow-lg shadow-slate-900/80">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Showing {payouts.length} pending{" "}
                  {payouts.length === 1 ? "payout" : "payouts"}.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
                      <th className="px-2 py-2 text-left">Card</th>
                      <th className="px-2 py-2 text-left">Amount</th>
                      <th className="px-2 py-2 text-left">Name</th>
                      <th className="px-2 py-2 text-left">Email</th>
                      <th className="px-2 py-2 text-left">Venmo</th>
                      <th className="px-2 py-2 text-left">Requested</th>
                      <th className="px-2 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((p) => {
                      const amt = cardAmounts[p.card_id];
                      const formattedAmount =
                        typeof amt === "number" && amt > 0
                          ? amt.toLocaleString("en-US", {
                              style: "currency",
                              currency: "USD",
                            })
                          : "—";

                      const created = new Date(p.created_at);
                      const createdStr = created.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <tr
                          key={p.id}
                          className="border-b border-slate-800/80 last:border-none"
                        >
                          <td className="px-2 py-2 align-top font-mono text-[11px] text-slate-300">
                            <div className="flex flex-col gap-0.5">
                              <span>{p.card_id}</span>
                              <Link
                                href={`/card/${p.card_id}`}
                                className="text-[10px] text-indigo-300 underline-offset-2 hover:text-indigo-200 hover:underline"
                                target="_blank"
                              >
                                View card
                              </Link>
                            </div>
                          </td>
                          <td className="px-2 py-2 align-top text-slate-100">
                            {formattedAmount}
                          </td>
                          <td className="px-2 py-2 align-top text-slate-100">
                            {p.contact_name}
                          </td>
                          <td className="px-2 py-2 align-top text-slate-200">
                            <a
                              href={`mailto:${p.contact_email}`}
                              className="hover:underline"
                            >
                              {p.contact_email}
                            </a>
                          </td>
                          <td className="px-2 py-2 align-top text-slate-100">
                            {p.payout_method === "venmo" && (
                              <span>@{p.payout_details.replace(/^@/, "")}</span>
                            )}
                          </td>
                          <td className="px-2 py-2 align-top text-slate-300">
                            {createdStr}
                          </td>
                          <td className="px-2 py-2 align-top text-right">
                            <button
                              onClick={() => handleMarkPaid(p.id)}
                              disabled={updatingId === p.id}
                              className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm transition hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring focus-visible:ring-emerald-500/60 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {updatingId === p.id
                                ? "Marking…"
                                : "Mark as paid"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
