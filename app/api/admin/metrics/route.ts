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

// Replace this with your real admin auth check if needed
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

function dollarsToCents(v: any): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : Number(String(v));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function safeParseJson(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "object") return v;
  if (typeof v !== "string") return null;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

function extractPrintfulCostsCents(rawPayload: any): number {
  const p = safeParseJson(rawPayload);
  const costs = p?.data?.order?.costs ?? null;
  if (!costs) return 0;

  // Printful returns strings like "7.39"
  const total = costs?.total ?? null;
  return dollarsToCents(total);
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
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
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

  // 1. Load paid orders in range
  const { data: orders, error: ordersErr } = await supabaseAdmin
    .from("orders")
    .select("id, created_at, amount_total, status")
    .gte("created_at", startIso)
    .lte("created_at", endIso)
    .eq("status", "paid");

  if (ordersErr) {
    return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
  }

  const orderList = Array.isArray(orders) ? orders : [];
  const orderIds = orderList.map((o: any) => o.id).filter(Boolean);

  // 2. Map each order to unique Printful order ids via card_print_jobs
  const orderToPrintfulIds: Record<string, Set<string>> = {};
  const allPrintfulIdsSet = new Set<string>();

  if (orderIds.length > 0) {
    const { data: jobs, error: jobsErr } = await supabaseAdmin
      .from("card_print_jobs")
      .select("order_id, printful_order_id")
      .in("order_id", orderIds);

    if (jobsErr) {
      return NextResponse.json({ error: "Failed to load print jobs" }, { status: 500 });
    }

    if (Array.isArray(jobs)) {
      for (const j of jobs) {
        const oid = j.order_id as string | null;
        const pfidRaw = j.printful_order_id;
        if (!oid || pfidRaw === null || pfidRaw === undefined) continue;

        const pfid = String(pfidRaw);
        if (!orderToPrintfulIds[oid]) orderToPrintfulIds[oid] = new Set<string>();
        orderToPrintfulIds[oid].add(pfid);
        allPrintfulIdsSet.add(pfid);
      }
    }
  }

  const allPrintfulIds = Array.from(allPrintfulIdsSet);

  // 3. Load shipment payloads for those Printful order ids and extract latest Printful cost per Printful order id
  const printfulCostByPrintfulId: Record<string, number> = {};

  if (allPrintfulIds.length > 0) {
    const { data: shipments, error: shipErr } = await supabaseAdmin
      .from("order_shipments")
      .select("printful_order_id, updated_at, raw_payload")
      .in("printful_order_id", allPrintfulIds);

    if (shipErr) {
      return NextResponse.json({ error: "Failed to load shipments" }, { status: 500 });
    }

    if (Array.isArray(shipments)) {
      const latest: Record<string, { updated_at: string; raw_payload: any }> = {};

      for (const s of shipments) {
        const pfid = String(s.printful_order_id ?? "");
        if (!pfid) continue;

        const updatedAt = String(s.updated_at ?? "");
        const prev = latest[pfid];

        if (!prev || updatedAt > prev.updated_at) {
          latest[pfid] = { updated_at: updatedAt, raw_payload: s.raw_payload };
        }
      }

      for (const pfid of Object.keys(latest)) {
        printfulCostByPrintfulId[pfid] = extractPrintfulCostsCents(latest[pfid].raw_payload);
      }
    }
  }

  // 4. Compute Printful cost per GiftLink order by summing unique Printful order ids
  const printfulCostByOrderId: Record<string, number> = {};
  for (const oid of orderIds) {
    const pfSet = orderToPrintfulIds[String(oid)];
    if (!pfSet || pfSet.size === 0) {
      printfulCostByOrderId[String(oid)] = 0;
      continue;
    }

    let cents = 0;
    for (const pfid of pfSet) {
      cents += printfulCostByPrintfulId[pfid] ?? 0;
    }
    printfulCostByOrderId[String(oid)] = cents;
  }

  // 5. Build day buckets, excluding any order with Printful cost 0
  const dayMap: Record<
    string,
    { ordersCount: number; revenueCents: number; printfulCostCents: number }
  > = {};

  for (const o of orderList) {
    const oid = String(o.id);
    const pfCents = printfulCostByOrderId[oid] ?? 0;

    // This is the new rule
    if (pfCents <= 0) continue;

    const created = new Date(o.created_at);
    const day = ymdUTC(created);

    if (!dayMap[day]) {
      dayMap[day] = { ordersCount: 0, revenueCents: 0, printfulCostCents: 0 };
    }

    dayMap[day].ordersCount += 1;
    dayMap[day].revenueCents += Number(o.amount_total ?? 0) || 0;
    dayMap[day].printfulCostCents += pfCents;
  }

  // 6. Build rows for every day in range
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
    const v = dayMap[day] ?? { ordersCount: 0, revenueCents: 0, printfulCostCents: 0 };
    const avgOrderCents = v.ordersCount > 0 ? Math.round(v.revenueCents / v.ordersCount) : 0;
    const grossProfitCents = v.revenueCents - v.printfulCostCents;
    const marginPct = v.revenueCents > 0 ? (grossProfitCents / v.revenueCents) * 100 : null;

    return {
      day,
      ordersCount: v.ordersCount,
      revenueCents: v.revenueCents,
      avgOrderCents,
      printfulCostCents: v.printfulCostCents,
      grossProfitCents,
      marginPct,
    };
  });

  const totals = rows.reduce(
    (acc, r) => {
      acc.ordersCount += r.ordersCount;
      acc.revenueCents += r.revenueCents;
      acc.printfulCostCents += r.printfulCostCents;
      return acc;
    },
    { ordersCount: 0, revenueCents: 0, printfulCostCents: 0 },
  );

  const totalsAvgOrderCents =
    totals.ordersCount > 0 ? Math.round(totals.revenueCents / totals.ordersCount) : 0;
  const totalsGrossProfitCents = totals.revenueCents - totals.printfulCostCents;
  const totalsMarginPct =
    totals.revenueCents > 0 ? (totalsGrossProfitCents / totals.revenueCents) * 100 : null;

  const responseJson = {
    range: { days, startIso, endIso },
    totals: {
      ordersCount: totals.ordersCount,
      revenueCents: totals.revenueCents,
      avgOrderCents: totalsAvgOrderCents,
      printfulCostCents: totals.printfulCostCents,
      grossProfitCents: totalsGrossProfitCents,
      marginPct: totalsMarginPct,
    },
    rows,
  };

  if (format === "csv") {
    const header = [
      "day",
      "orders_count",
      "revenue_usd",
      "avg_order_usd",
      "printful_cost_usd",
      "gross_profit_usd",
      "margin_pct",
    ].join(",");

    const lines = rows.map((r) => {
      const revenueUsd = (r.revenueCents / 100).toFixed(2);
      const avgUsd = (r.avgOrderCents / 100).toFixed(2);
      const pfUsd = (r.printfulCostCents / 100).toFixed(2);
      const gpUsd = (r.grossProfitCents / 100).toFixed(2);
      const mp = r.marginPct === null ? "" : r.marginPct.toFixed(2);

      return [
        csvEscape(r.day),
        csvEscape(r.ordersCount),
        csvEscape(revenueUsd),
        csvEscape(avgUsd),
        csvEscape(pfUsd),
        csvEscape(gpUsd),
        csvEscape(mp),
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

  return NextResponse.json(responseJson, { headers: { "Cache-Control": "no-store" } });
}
