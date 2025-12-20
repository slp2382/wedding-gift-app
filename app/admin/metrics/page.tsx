"use client";

// app/admin/metrics/page.tsx

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type DailyMetricsRow = {
  day: string; // YYYY-MM-DD
  ordersCount: number;
  revenueCents: number;
  avgOrderCents: number;
  printfulCostCents: number;
  grossProfitCents: number;
  marginPct: number | null;
};

type MetricsResponse = {
  range: { days: number; startIso: string; endIso: string };
  totals: {
    ordersCount: number;
    revenueCents: number;
    avgOrderCents: number;
    printfulCostCents: number;
    grossProfitCents: number;
    marginPct: number | null;
  };
  rows: DailyMetricsRow[];
};

function fmtMoney(cents: number) {
  const v = cents / 100;
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function fmtPct(v: number | null) {
  if (v === null || Number.isNaN(v)) return "—";
  return `${v.toFixed(1)}%`;
}

export default function AdminMetricsPage() {
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<MetricsResponse | null>(null);

  const csvHref = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("days", String(days));
    sp.set("format", "csv");
    return `/api/admin/metrics?${sp.toString()}`;
  }, [days]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr(null);

      try {
        const sp = new URLSearchParams();
        sp.set("days", String(days));

        const resp = await fetch(`/api/admin/metrics?${sp.toString()}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        if (!resp.ok) {
          const txt = await resp.text().catch(() => "");
          throw new Error(txt || `Request failed (${resp.status})`);
        }

        const json = (await resp.json()) as MetricsResponse;
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Failed to load metrics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [days]);

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold tracking-widest text-zinc-500">
              GIFTLINK ADMIN
            </div>
            <h1 className="mt-2 text-3xl font-bold">Metrics</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Daily performance and fulfillment cost tracking.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              Back
            </Link>

            <a
              href={csvHref}
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"
            >
              Export CSV
            </a>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            Range
          </div>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last 365 days</option>
          </select>

          {data?.range ? (
            <div className="text-xs text-zinc-500">
              {data.range.startIso} to {data.range.endIso}
            </div>
          ) : null}
        </div>

        {err ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
            {err}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-xs font-semibold tracking-widest text-zinc-500">
              ORDERS
            </div>
            <div className="mt-2 text-2xl font-bold">
              {loading ? "…" : data?.totals.ordersCount ?? 0}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-xs font-semibold tracking-widest text-zinc-500">
              REVENUE
            </div>
            <div className="mt-2 text-2xl font-bold">
              {loading ? "…" : fmtMoney(data?.totals.revenueCents ?? 0)}
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              Avg {loading ? "…" : fmtMoney(data?.totals.avgOrderCents ?? 0)}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-xs font-semibold tracking-widest text-zinc-500">
              PRINTFUL COST
            </div>
            <div className="mt-2 text-2xl font-bold">
              {loading ? "…" : fmtMoney(data?.totals.printfulCostCents ?? 0)}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-xs font-semibold tracking-widest text-zinc-500">
              GROSS PROFIT
            </div>
            <div className="mt-2 text-2xl font-bold">
              {loading ? "…" : fmtMoney(data?.totals.grossProfitCents ?? 0)}
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              Margin {loading ? "…" : fmtPct(data?.totals.marginPct ?? null)}
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-5 py-4 text-sm font-semibold dark:border-zinc-800">
            Daily breakdown
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-950/40">
                <tr>
                  <th className="px-4 py-3 text-left">Day</th>
                  <th className="px-4 py-3 text-right">Orders</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-right">Avg order</th>
                  <th className="px-4 py-3 text-right">Printful cost</th>
                  <th className="px-4 py-3 text-right">Gross profit</th>
                  <th className="px-4 py-3 text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-5 text-zinc-500" colSpan={7}>
                      Loading…
                    </td>
                  </tr>
                ) : (data?.rows?.length ?? 0) === 0 ? (
                  <tr>
                    <td className="px-4 py-5 text-zinc-500" colSpan={7}>
                      No data in this range.
                    </td>
                  </tr>
                ) : (
                  data!.rows.map((r) => (
                    <tr
                      key={r.day}
                      className="border-t border-zinc-100 dark:border-zinc-800"
                    >
                      <td className="px-4 py-3">{r.day}</td>
                      <td className="px-4 py-3 text-right">{r.ordersCount}</td>
                      <td className="px-4 py-3 text-right">
                        {fmtMoney(r.revenueCents)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {fmtMoney(r.avgOrderCents)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {fmtMoney(r.printfulCostCents)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {fmtMoney(r.grossProfitCents)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {fmtPct(r.marginPct)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 text-xs text-zinc-500">
          Printful costs are computed from the latest shipment payload available per Printful order id.
        </div>
      </div>
    </div>
  );
}
