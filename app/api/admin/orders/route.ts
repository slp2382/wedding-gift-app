// app/api/admin/orders/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Admin orders route is not configured, missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
  );
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

function safeTime(value: any): number {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

function normalizeStatus(v: any): string {
  return String(v ?? "").trim().toLowerCase();
}

function deriveGroupFulfillmentStatus(args: {
  jobFulfillmentStatuses: Array<string | null | undefined>;
  jobStatuses: Array<string | null | undefined>;
  hasError: boolean;
  shipmentStatus?: string | null;
  deliveredAt?: string | null;
  shippedAt?: string | null;
}): string {
  if (args.deliveredAt) return "delivered";

  const shipStatus = normalizeStatus(args.shipmentStatus);
  if (shipStatus.includes("deliver")) return "delivered";
  if (args.shippedAt) return "shipped";
  if (shipStatus.includes("ship")) return "shipped";

  const f = args.jobFulfillmentStatuses.map(normalizeStatus);
  const s = args.jobStatuses.map(normalizeStatus);

  const any = (pred: (v: string) => boolean) => f.some(pred) || s.some(pred);

  if (any((v) => v === "delivered")) return "delivered";
  if (any((v) => v === "shipped")) return "shipped";

  if (args.hasError || any((v) => v === "error")) return "error";

  if (any((v) => v === "processing" || v === "inprocess" || v === "in_process"))
    return "processing";

  return "pending";
}

export async function GET(req: NextRequest) {
  try {
    const { data: jobs, error: jobsError } = await supabaseAdmin
      .from("card_print_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (jobsError) {
      console.error("[admin orders] Error fetching card_print_jobs", jobsError);
      return NextResponse.json(
        { error: "Failed to fetch card print jobs" },
        { status: 500 },
      );
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ orders: [] });
    }

    const orderIds = Array.from(
      new Set(
        jobs
          .map((j) => j.order_id as string | null)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const cardIds = Array.from(
      new Set(
        jobs
          .map((j) => j.card_id as string | null)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    let ordersById: Record<string, any> = {};
    if (orderIds.length > 0) {
      const { data: orders, error: ordersError } = await supabaseAdmin
        .from("orders")
        .select("*")
        .in("id", orderIds);

      if (ordersError) {
        console.error("[admin orders] Error fetching orders", ordersError);
      } else if (orders) {
        ordersById = Object.fromEntries(orders.map((o) => [String(o.id), o]));
      }
    }

    let cardsByCardId: Record<string, any> = {};
    if (cardIds.length > 0) {
      const { data: cards, error: cardsError } = await supabaseAdmin
        .from("cards")
        .select("*")
        .in("card_id", cardIds);

      if (cardsError) {
        console.error("[admin orders] Error fetching cards", cardsError);
      } else if (cards) {
        cardsByCardId = Object.fromEntries(
          cards.map((c) => [String(c.card_id), c]),
        );
      }
    }

    let latestShipmentByOrderId: Record<string, any> = {};
    if (orderIds.length > 0) {
      const { data: shipments, error: shipErr } = await supabaseAdmin
        .from("order_shipments")
        .select("*")
        .in("order_id", orderIds);

      if (shipErr) {
        console.error("[admin orders] Error fetching order_shipments", shipErr);
      } else if (shipments && shipments.length > 0) {
        for (const s of shipments) {
          const oid = String(s.order_id);
          const prev = latestShipmentByOrderId[oid];

          const prevTime = Math.max(
            safeTime(prev?.last_event_at),
            safeTime(prev?.delivered_at),
            safeTime(prev?.shipped_at),
          );

          const nextTime = Math.max(
            safeTime(s?.last_event_at),
            safeTime(s?.delivered_at),
            safeTime(s?.shipped_at),
          );

          if (!prev || nextTime >= prevTime) {
            latestShipmentByOrderId[oid] = s;
          }
        }
      }
    }

    const groups = new Map<
      string,
      { key: string; orderId: string | null; jobs: any[] }
    >();

    for (const j of jobs) {
      const oid = (j.order_id as string | null) ?? null;
      const key = oid ? `order:${oid}` : `job:${String(j.id)}`;

      const existing = groups.get(key);
      if (existing) existing.jobs.push(j);
      else groups.set(key, { key, orderId: oid, jobs: [j] });
    }

    const rows = Array.from(groups.values()).map((g) => {
      const order = g.orderId ? ordersById[String(g.orderId)] : null;
      const shipment = g.orderId
        ? latestShipmentByOrderId[String(g.orderId)]
        : null;

      const jobIds = g.jobs.map((j) => String(j.id));

      const groupCardIds = g.jobs
        .map((j) => (j.card_id as string | null) ?? null)
        .filter((v): v is string => Boolean(v));

      const printFileUrls = groupCardIds
        .map((cid) => {
          const card = cardsByCardId[String(cid)];
          return (card?.print_file_url as string | null) ?? null;
        })
        .filter((v): v is string => Boolean(v));

      const printfulOrderIds = Array.from(
        new Set(
          g.jobs
            .map((j) => j.printful_order_id as string | number | null)
            .filter((v) => v !== null && v !== undefined),
        ),
      );

      const primaryPrintfulOrderId =
        printfulOrderIds.length > 0 ? printfulOrderIds[0] : null;

      const createdAt =
        (order?.created_at as string | null) ??
        (g.jobs[0]?.created_at as string | null) ??
        null;

      const paymentStatus = order?.status ?? null;

      const shippingName = order?.shipping_name ?? null;
      const shippingCity = order?.shipping_city ?? null;
      const shippingState = order?.shipping_state ?? null;
      const shippingPostalCode = order?.shipping_postal_code ?? null;

      const email = order?.email ?? null;
      const amountTotal = order?.amount_total ?? null;

      const hasError =
        g.jobs.some((j) => Boolean(j.error_message)) ||
        g.jobs.some((j) => normalizeStatus(j.status) === "error");

      const fulfillmentStatus = deriveGroupFulfillmentStatus({
        jobFulfillmentStatuses: g.jobs.map(
          (j) => (j.fulfillment_status as string | null) ?? null,
        ),
        jobStatuses: g.jobs.map((j) => (j.status as string | null) ?? null),
        hasError,
        shipmentStatus: shipment?.status ?? null,
        deliveredAt: shipment?.delivered_at ?? null,
        shippedAt: shipment?.shipped_at ?? null,
      });

      const printfulStatus =
        (g.jobs[0]?.printful_status as string | null) ?? null;

      const errorMessage =
        (g.jobs.find((j) => Boolean(j.error_message))?.error_message as
          | string
          | null
          | undefined) ?? null;

      return {
        orderId: g.orderId,
        jobIds,
        quantity: g.jobs.length,

        createdAt,

        cardIds: groupCardIds,
        primaryCardId: groupCardIds[0] ?? null,
        printFileUrls,

        fulfillmentStatus,
        printfulStatus,
        printfulOrderId: primaryPrintfulOrderId,
        printfulOrderIds,

        jobStatus: (g.jobs[0]?.status as string | null) ?? null,
        errorMessage,

        paymentStatus,

        shippingName,
        shippingCity,
        shippingState,
        shippingPostalCode,

        email,
        amountTotal,

        trackingNumber: shipment?.tracking_number ?? null,
        trackingUrl: shipment?.tracking_url ?? null,
        shipmentStatus: shipment?.status ?? null,
        shippedAt: shipment?.shipped_at ?? null,
        deliveredAt: shipment?.delivered_at ?? null,
        trackingEmailSentAt: shipment?.tracking_email_sent_at ?? null,
        carrier: shipment?.carrier ?? null,
        service: shipment?.service ?? null,
      };
    });

    rows.sort((a: any, b: any) => safeTime(b.createdAt) - safeTime(a.createdAt));

    return NextResponse.json({ orders: rows });
  } catch (err) {
    console.error("[admin orders] Unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected error fetching admin orders" },
      { status: 500 },
    );
  }
}
