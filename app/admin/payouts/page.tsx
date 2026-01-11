"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [cardAmounts, setCardAmounts] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadPendingPayouts() {
    setLoading(true);
    setAdminError(null);

    try {
      const res = await fetch("/api/admin/payouts", { method: "GET" });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setAdminError((data && data.error) || "Could not load payout requests.");
        setLoading(false);
        return;
      }

      setPayouts((data && data.payouts) || []);
      setCardAmounts((data && data.cardAmountMap) || {});
    } catch (err) {
      setAdminError("Unexpected error while loading payout requests.");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadPendingPayouts();
  }, []);

  async function handleMarkPaid(id: string) {
    setAdminError(null);
    setUpdatingId(id);

    try {
      const res = await fetch("/api/admin/payouts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setAdminError((data && data.error) || "Could not update payout status.");
        setUpdatingId(null);
        return;
      }

      setPayouts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setAdminError("Unexpected error while updating payout status.");
    }

    setUpdatingId(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-6 text-slate-50">
      <div className="mx-auto flex min-h-[90vh] max-w-5xl flex-col">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-400 to-emerald-400 shadow-md shadow-indigo-500/30">
              <span className="text-lg font-semibold text-white">G</span>
            </div>
            <div className="leading-tight">
              <p className="text-lg font-semibold tracking-tight">GiftLink</p>
              <p className="text-xs text-slate-400">Internal admin · Payouts</p>
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
            <h1 className="text-2xl font-semibold tracking-tight">Pending Venmo payout requests</h1>
            <p className="text-sm text-slate-400">
              This view is for internal use only. When you send a payout via Venmo, click Mark as paid to mark it completed.
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
                When someone submits their Venmo handle for a funded card, the request will appear here.
              </p>
            </section>
          )}

          {!loading && !adminError && payouts.length > 0 && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-100 shadow-lg shadow-slate-900/80">
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
                      <th className="px-2 py-2 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((p) => (
                      <tr key={p.id} className="border-b border-slate-800/70">
                        <td className="px-2 py-2 font-mono text-[11px] text-slate-200">{p.card_id}</td>
                        <td className="px-2 py-2 text-slate-200">
                          {cardAmounts[p.card_id] != null ? `$${Number(cardAmounts[p.card_id]).toFixed(2)}` : "—"}
                        </td>
                        <td className="px-2 py-2 text-slate-200">{p.contact_name}</td>
                        <td className="px-2 py-2 text-slate-300">{p.contact_email}</td>
                        <td className="px-2 py-2 text-slate-200">{p.payout_details}</td>
                        <td className="px-2 py-2 text-slate-400">
                          {new Date(p.created_at).toLocaleString()}
                        </td>
                        <td className="px-2 py-2">
                          <button
                            onClick={() => handleMarkPaid(p.id)}
                            disabled={updatingId === p.id}
                            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                          >
                            {updatingId === p.id ? "Updating…" : "Mark as paid"}
                          </button>
                        </td>
                      </tr>
                    ))}
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
