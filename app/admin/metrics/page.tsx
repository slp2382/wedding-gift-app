"use client";

// app/admin/metrics/page.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type DailyRow = {
  day: string; // YYYY-MM-DD
  ordersCount: number;
  revenueCents: number;
  avgOrderCents: number;
};

type MetricsResponse = {
  range: { days: number; startIso: string; endIso: string };
  totals: {
    ordersCount: number;
    revenueCents: number;
    avgOrderCents: number;
  };
  rows: DailyRow[];
};

function fmtMoney(cents: number) {
  const v = cents / 100;
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function buildLinePath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return "";
  const parts: string[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    parts.push(`${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
  }
  return parts.join(" ");
}

export default function AdminMetricsPage() {
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<MetricsResponse | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState<number>(900);

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  useEffect(() => {
    function onResize() {
      const el = containerRef.current;
      if (!el) return;
      setW(Math.max(320, Math.floor(el.getBoundingClientRect().width)));
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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

  const chart = useMemo(() => {
    const rows = data?.rows ?? [];
    const width = w;
    const height = 280;

    const padL = 52;
    const padR = 18;
    const padT = 18;
    const padB = 42;

    const innerW = Math.max(10, width - padL - padR);
    const innerH = Math.max(10, height - padT - padB);

    const values = rows.map((r) => r.revenueCents);
    const maxV = Math.max(0, ...values);
    const minV = 0;

    const xFor = (i: number) => padL + (i / Math.max(1, rows.length - 1)) * innerW;
    const yFor = (v: number) => {
      if (maxV <= minV) return padT + innerH;
      const t = (v - minV) / (maxV - minV);
      return padT + (1 - t) * innerH;
    };

    const pts = rows.map((r, i) => ({ x: xFor(i), y: yFor(r.revenueCents) }));
    const path = buildLinePath(pts);

    // Y ticks
    const ticks = 4;
    const yTicks = Array.from({ length: ticks + 1 }).map((_, i) => {
      const t = i / ticks;
      const v = Math.round((1 - t) * maxV);
      const y = yFor(v);
      return { y, v };
    });

    // X labels: show about 6
    const desired = 6;
    const step = Math.max(1, Math.floor(rows.length / desired));
    const xLabels = rows
      .map((r, i) => ({ i, day: r.day }))
      .filter((_, idx) => idx % step === 0 || idx === rows.length - 1);

    const hover = hoverIdx === null ? null : rows[hoverIdx] ?? null;

    return {
      width,
      height,
      padL,
      padR,
      padT,
      padB,
      pts,
      path,
      yTicks,
      xLabels,
      maxV,
      xFor,
      yFor,
      hover,
    };
  }, [data, w, hoverIdx]);

  function onMove(e: React.MouseEvent<SVGSVGElement, MouseEvent>) {
    const rows = data?.rows ?? [];
    if (rows.length === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const left = chart.padL;
    const right = chart.width - chart.padR;
    const t = (x - left) / Math.max(1, right - left);
    const idx = Math.round(clamp(t, 0, 1) * (rows.length - 1));

    setHoverIdx(idx);
  }

  function onLeave() {
    setHoverIdx(null);
  }

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
              Daily revenue and order volume.
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

        <div className="mt-6 grid gap-4 md:grid-cols-3">
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
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-xs font-semibold tracking-widest text-zinc-500">
              AVG ORDER
            </div>
            <div className="mt-2 text-2xl font-bold">
              {loading ? "…" : fmtMoney(data?.totals.avgOrderCents ?? 0)}
            </div>
          </div>
        </div>

        <div
          ref={containerRef}
          className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <div className="text-sm font-semibold">Daily revenue</div>
            {chart.hover ? (
              <div className="text-xs text-zinc-600 dark:text-zinc-300">
                <span className="font-semibold">{chart.hover.day}</span>
                <span className="mx-2 text-zinc-400">|</span>
                <span>{fmtMoney(chart.hover.revenueCents)}</span>
                <span className="mx-2 text-zinc-400">|</span>
                <span>{chart.hover.ordersCount} orders</span>
              </div>
            ) : (
              <div className="text-xs text-zinc-500">Hover the chart</div>
            )}
          </div>

          <div className="p-4">
            <svg
              width={chart.width}
              height={chart.height}
              onMouseMove={onMove}
              onMouseLeave={onLeave}
              className="block"
            >
              {/* Grid and Y labels */}
              {chart.yTicks.map((t, idx) => (
                <g key={idx}>
                  <line
                    x1={chart.padL}
                    y1={t.y}
                    x2={chart.width - chart.padR}
                    y2={t.y}
                    stroke="currentColor"
                    opacity={0.12}
                  />
                  <text
                    x={chart.padL - 10}
                    y={t.y + 4}
                    textAnchor="end"
                    fontSize="10"
                    fill="currentColor"
                    opacity={0.55}
                  >
                    {fmtMoney(t.v)}
                  </text>
                </g>
              ))}

              {/* X labels */}
              {chart.xLabels.map((xl) => {
                const x = chart.xFor(xl.i);
                return (
                  <text
                    key={xl.i}
                    x={x}
                    y={chart.height - 14}
                    textAnchor="middle"
                    fontSize="10"
                    fill="currentColor"
                    opacity={0.55}
                  >
                    {xl.day.slice(5)}
                  </text>
                );
              })}

              {/* Line */}
              <path
                d={chart.path}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                opacity={0.9}
              />

              {/* Points */}
              {(data?.rows ?? []).map((r, i) => {
                const p = chart.pts[i];
                const active = hoverIdx === i;
                return (
                  <circle
                    key={r.day}
                    cx={p.x}
                    cy={p.y}
                    r={active ? 4.2 : 2.6}
                    fill="currentColor"
                    opacity={active ? 0.9 : 0.45}
                  />
                );
              })}

              {/* Hover vertical */}
              {hoverIdx !== null && (data?.rows ?? []).length > 0 ? (
                <line
                  x1={chart.pts[hoverIdx].x}
                  y1={chart.padT}
                  x2={chart.pts[hoverIdx].x}
                  y2={chart.height - chart.padB}
                  stroke="currentColor"
                  opacity={0.18}
                />
              ) : null}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
