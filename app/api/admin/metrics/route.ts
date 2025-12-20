// app/api/admin/metrics/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const supabaseAdmin =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { persistSession: false },
      })
    : null;

// Replace with your real admin auth check if needed
async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  return null;
}

function clampInt(v: any, fallback: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  return Math.min(Math.max(i, min), max);
}

function ymdUTC(d: Date) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function csvEscape(v: any) {
  const s = String(v ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}

export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 },
    );
  }

  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(req.url);
  const days = clampInt(searchParams.get("days"), 30, 1, 365);
  const format = String(searchParams.get("format") ?? "").toLowerCase();

  const end = new Date();
  const endIso = end.toISOString();

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  start.setUTCHours(0, 0, 0, 0);
  const startIso = start.toISOString();

  // Paid orders only
  const { data: orders, error: ordersErr } = await supabaseAdmin
    .from("orders")
    .select("id, created_at, amount_total, status")
    .gte("created_at", startIso)
    .lte("created_at", endIso)
    .eq("status", "paid");

  if (ordersErr) {
    return NextResponse.json(
      { error: "Failed to load orders" },
      { status: 500 },
    );
  }

  const orderList = Array.isArray(orders) ? orders : [];

  const dayMap: Record<string, { ordersCount: number; revenueCents: number }> =
    {};

  for (const o of orderList) {
    const created = new Date(o.created_at);
    const day = ymdUTC(created);

    if (!dayMap[day]) {
      dayMap[day] = { ordersCount: 0, revenueCents: 0 };
    }

    dayMap[day].ordersCount += 1;
    dayMap[day].revenueCents += Number(o.amount_total ?? 0) || 0;
  }

  // Build full day list for range
  const daysInRange: string[] = [];
  {
    const cur = new Date(start);
    const endDay = new Date(end);
    endDay.setUTCHours(0, 0, 0, 0);

    while (cur.getTime() <= endDay.getTime()) {
      daysInRange.push(ymdUTC(cur));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  }

  const rows = daysInRange.map((day) => {
    const v = dayMap[day] ?? { ordersCount: 0, revenueCents: 0 };
    const avgOrderCents =
      v.ordersCount > 0 ? Math.round(v.revenueCents / v.ordersCount) : 0;

    return {
      day,
      ordersCount: v.ordersCount,
      revenueCents: v.revenueCents,
      avgOrderCents,
    };
  });

  const totals = rows.reduce(
    (acc, r) => {
      acc.ordersCount += r.ordersCount;
      acc.revenueCents += r.revenueCents;
      return acc;
    },
    { ordersCount: 0, revenueCents: 0 },
  );

  const totalsAvgOrderCents =
    totals.ordersCount > 0
      ? Math.round(totals.revenueCents / totals.ordersCount)
      : 0;

  const responseJson = {
    range: { days, startIso, endIso },
    totals: {
      ordersCount: totals.ordersCount,
      revenueCents: totals.revenueCents,
      avgOrderCents: totalsAvgOrderCents,
    },
    rows,
  };

  if (format === "csv") {
    const header = ["day", "orders_count", "revenue_usd", "avg_order_usd"].join(
      ",",
    );

    const lines = rows.map((r) => {
      const revenueUsd = (r.revenueCents / 100).toFixed(2);
      const avgUsd = (r.avgOrderCents / 100).toFixed(2);

      return [
        csvEscape(r.day),
        csvEscape(r.ordersCount),
        csvEscape(revenueUsd),
        csvEscape(avgUsd),
      ].join(",");
    });

    const csv = [header, ...lines].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="giftlink_metrics_${startIso.slice(0, 10)}_to_${endIso.slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json(responseJson, {
    headers: { "Cache-Control": "no-store" },
  });
}
