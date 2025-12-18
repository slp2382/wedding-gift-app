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

export const runtime = "nodejs";

function safeTime(value: any): number {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
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
            safeTime(prev?.shipped_at),
            safeTime(prev?.last_event_at),
            safeTime(prev?.created_at),
          );

          const thisTime = Math.max(
            safeTime(s?.shipped_at),
            safeTime(s?.last_event_at),
            safeTime(s?.created_at),
          );

          if (!prev || thisTime >= prevTime) {
            latestShipmentByOrderId[oid] = s;
          }
        }
      }
    }

    const rows = jobs.map((job) => {
      const order = job.order_id ? ordersById[String(job.order_id)] : null;
      const card = job.card_id ? cardsByCardId[String(job.card_id)] : null;

      const createdAt = (job.created_at as string | null) ?? null;

      const fulfillmentStatus =
        (job.fulfillment_status as string | null) ?? "pending";

      const printfulStatus = (job.printful_status as string | null) ?? null;

      const paymentStatus = order?.status ?? null;

      const shippingName = order?.shipping_name ?? null;
      const shippingCity = order?.shipping_city ?? null;
      const shippingState = order?.shipping_state ?? null;
      const shippingPostalCode = order?.shipping_postal_code ?? null;
      const email = order?.email ?? null;

      const amountTotal = order?.amount_total ?? null;

      const printFileUrl = card?.print_file_url ?? null;

      const printfulOrderId = job.printful_order_id ?? null;

      const shipment = job.order_id
        ? latestShipmentByOrderId[String(job.order_id)]
        : null;

      return {
        jobId: job.id,
        createdAt,
        cardId: (job.card_id as string | null) ?? null,
        orderId: (job.order_id as string | null) ?? null,
        fulfillmentStatus,
        printfulStatus,
        printfulOrderId,
        jobStatus: (job.status as string | null) ?? null,
        errorMessage: (job.error_message as string | null) ?? null,
        paymentStatus,
        shippingName,
        shippingCity,
        shippingState,
        shippingPostalCode,
        email,
        amountTotal,
        printFileUrl,

        trackingNumber: shipment?.tracking_number ?? null,
        trackingUrl: shipment?.tracking_url ?? null,
        shipmentStatus: shipment?.status ?? null,
        shippedAt: shipment?.shipped_at ?? null,
        deliveredAt: shipment?.delivered_at ?? null,
        trackingEmailSentAt: shipment?.tracking_email_sent_at ?? null,
      };
    });

    return NextResponse.json({ orders: rows });
  } catch (err) {
    console.error("[admin orders] Unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected error fetching admin orders" },
      { status: 500 },
    );
  }
}
