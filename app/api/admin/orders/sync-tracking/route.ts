// app/api/admin/orders/sync-tracking/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const printfulToken = process.env.PRINTFUL_API_KEY ?? "";
const printfulStoreId = process.env.PRINTFUL_STORE_ID ?? "";
const adminToken = process.env.ADMIN_SYNC_TOKEN ?? "";

const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      })
    : null;

type ShipmentRow = {
  shipmentId: string;
  status?: string | null;
  carrier?: string | null;
  service?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  reshipment?: boolean;

  // Debug helpers so we can see what Printful returned
  rawShippedAt?: any;
  rawDeliveredAt?: any;
};

function toIsoOrNull(v: any): string | null {
  if (v === null || v === undefined) return null;

  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;

    // Numeric string timestamp
    if (/^\d+(\.\d+)?$/.test(s)) {
      const n = Number(s);
      if (!Number.isFinite(n)) return null;
      return toIsoOrNull(n);
    }

    const d = new Date(s);
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  }

  if (typeof v === "number") {
    if (!Number.isFinite(v)) return null;

    // Values under 1e12 are almost certainly seconds, convert to ms
    const ms = v < 1_000_000_000_000 ? Math.round(v * 1000) : Math.round(v);
    const d = new Date(ms);
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  }

  try {
    const d = new Date(v);
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  } catch {
    return null;
  }
}

function buildPrintfulHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${printfulToken}`,
    "Content-Type": "application/json",
  };

  if (printfulStoreId) {
    headers["X-PF-Store-Id"] = printfulStoreId;
  }

  return headers;
}

async function fetchShipmentsV2(printfulOrderId: string) {
  const url = `https://api.printful.com/v2/orders/${encodeURIComponent(
    printfulOrderId,
  )}/shipments`;

  const resp = await fetch(url, {
    method: "GET",
    headers: buildPrintfulHeaders(),
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    console.warn(
      "[sync-tracking] Printful v2 shipments fetch failed",
      resp.status,
      txt,
    );
    // Returning null means try fallback
    return null;
  }

  const json = await resp.json().catch(() => null);

  const shipments = Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json?.result)
      ? json.result
      : Array.isArray(json?.shipments)
        ? json.shipments
        : null;

  if (!Array.isArray(shipments)) return [];

  return shipments
    .map((s: any) => {
      const shipmentId = s?.id ?? s?.shipment_id ?? s?.shipmentId ?? null;
      if (!shipmentId) return null;

      const rawShippedAt = s?.shipped_at ?? s?.shippedAt ?? null;
      const rawDeliveredAt = s?.delivered_at ?? s?.deliveredAt ?? null;

      return {
        shipmentId: String(shipmentId),
        status: s?.shipment_status
          ? String(s.shipment_status)
          : s?.status
            ? String(s.status)
            : null,
        carrier: s?.carrier ? String(s.carrier) : null,
        service: s?.service ? String(s.service) : null,
        trackingNumber: s?.tracking_number ? String(s.tracking_number) : null,
        trackingUrl: s?.tracking_url ? String(s.tracking_url) : null,
        shippedAt: toIsoOrNull(rawShippedAt),
        deliveredAt: toIsoOrNull(rawDeliveredAt),
        reshipment: Boolean(s?.is_reshipment ?? s?.reshipment ?? false),
        rawShippedAt,
        rawDeliveredAt,
      } as ShipmentRow;
    })
    .filter(Boolean) as ShipmentRow[];
}

async function fetchShipmentsV1(printfulOrderId: string) {
  const url = `https://api.printful.com/orders/${encodeURIComponent(
    printfulOrderId,
  )}`;

  const resp = await fetch(url, {
    method: "GET",
    headers: buildPrintfulHeaders(),
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    console.warn(
      "[sync-tracking] Printful v1 order fetch failed",
      resp.status,
      txt,
    );
    return [];
  }

  const json = await resp.json().catch(() => null);
  const shipments = json?.result?.shipments;
  if (!Array.isArray(shipments)) return [];

  return shipments
    .map((s: any) => {
      const shipmentId = s?.id ?? s?.shipment_id ?? s?.shipmentId ?? null;
      if (!shipmentId) return null;

      const rawShippedAt = s?.shipped_at ?? s?.shippedAt ?? null;
      const rawDeliveredAt = s?.delivered_at ?? s?.deliveredAt ?? null;

      return {
        shipmentId: String(shipmentId),
        status: s?.status ? String(s.status) : null,
        carrier: s?.carrier ? String(s.carrier) : null,
        service: s?.service ? String(s.service) : null,
        trackingNumber: s?.tracking_number ? String(s.tracking_number) : null,
        trackingUrl: s?.tracking_url ? String(s.tracking_url) : null,
        shippedAt: toIsoOrNull(rawShippedAt),
        deliveredAt: toIsoOrNull(rawDeliveredAt),
        reshipment: Boolean(s?.reshipment ?? false),
        rawShippedAt,
        rawDeliveredAt,
      } as ShipmentRow;
    })
    .filter(Boolean) as ShipmentRow[];
}

async function fetchPrintfulShipments(printfulOrderId: string) {
  // Prefer v1 first since you are using /orders/{id} elsewhere
  const v1 = await fetchShipmentsV1(printfulOrderId);
  if (v1.length > 0) return v1;

  // Then try v2
  const v2 = await fetchShipmentsV2(printfulOrderId);
  if (v2 !== null && v2.length > 0) return v2;

  return [];
}

async function sendTrackingEmail(args: {
  to: string;
  orderId: string;
  trackingUrl?: string | null;
  trackingNumber?: string | null;
}) {
  const host = process.env.ZOHO_SMTP_HOST ?? "";
  const portRaw = process.env.ZOHO_SMTP_PORT ?? "";
  const user = process.env.ZOHO_SMTP_USER ?? "";
  const pass = process.env.ZOHO_SMTP_PASS ?? "";
  const from = process.env.MAIL_FROM ?? user;
  const replyTo = process.env.MAIL_REPLY_TO ?? "";

  if (!host || !portRaw || !user || !pass || !from) {
    throw new Error("SMTP env not configured");
  }

  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("Invalid SMTP port");
  }

  const mod: any = await import("nodemailer");
  const nodemailerAny = mod?.default ?? mod;

  const transporter = nodemailerAny.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 6000,
    greetingTimeout: 6000,
    socketTimeout: 10000,
  });

  const subject = "Your GiftLink order has shipped";

  const trackingLine = args.trackingUrl
    ? `Tracking link: ${args.trackingUrl}`
    : args.trackingNumber
      ? `Tracking number: ${args.trackingNumber}`
      : "Tracking: not provided yet";

  const text =
    `Good news, your GiftLink order is on the way.\n\n` +
    `Order ID: ${args.orderId}\n` +
    `${trackingLine}\n\n` +
    `Questions? Reply to this email.\n`;

  const html =
    `<div style="font-family:Arial,sans-serif;line-height:1.45">` +
    `<p>Good news, your GiftLink order is on the way.</p>` +
    `<p><strong>Order ID:</strong> ${args.orderId}</p>` +
    (args.trackingUrl
      ? `<p><strong>Tracking link:</strong> <a href="${args.trackingUrl}">${args.trackingUrl}</a></p>`
      : args.trackingNumber
        ? `<p><strong>Tracking number:</strong> ${args.trackingNumber}</p>`
        : `<p><strong>Tracking:</strong> not provided yet</p>`) +
    `<p>Questions? Reply to this email.</p>` +
    `</div>`;

  await transporter.sendMail({
    from,
    to: args.to,
    subject,
    text,
    html,
    ...(replyTo ? { replyTo } : {}),
  });
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  if (!printfulToken) {
    return NextResponse.json({ error: "Printful not configured" }, { status: 500 });
  }

  if (!adminToken) {
    return NextResponse.json({ error: "ADMIN_SYNC_TOKEN not configured" }, { status: 500 });
  }

  const providedToken = req.headers.get("xadmintoken") ?? "";
  if (providedToken !== adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = (body?.orderId ?? body?.order_id ?? null) as string | null;
  const printfulOrderIdInput =
    body?.printfulOrderId ?? body?.printful_order_id ?? null;

  let printfulOrderIds: string[] = [];

  if (printfulOrderIdInput) {
    printfulOrderIds = [String(printfulOrderIdInput)];
  } else if (orderId) {
    const { data: jobs, error } = await supabaseAdmin
      .from("card_print_jobs")
      .select("printful_order_id")
      .eq("order_id", orderId)
      .not("printful_order_id", "is", null);

    if (error) {
      return NextResponse.json(
        { error: "Failed to look up printful order id" },
        { status: 500 },
      );
    }

    const ids = (jobs ?? [])
      .map((j: any) => j.printful_order_id)
      .filter((v: any) => Boolean(v))
      .map((v: any) => String(v));

    printfulOrderIds = Array.from(new Set(ids));
  } else {
    return NextResponse.json(
      { error: "Provide orderId or printfulOrderId" },
      { status: 400 },
    );
  }

  if (printfulOrderIds.length === 0) {
    return NextResponse.json({ error: "No Printful order id found" }, { status: 404 });
  }

  let resolvedOrderId = orderId;

  if (!resolvedOrderId) {
    const { data: job, error } = await supabaseAdmin
      .from("card_print_jobs")
      .select("order_id")
      .eq("printful_order_id", printfulOrderIds[0])
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Failed to resolve order id" }, { status: 500 });
    }

    resolvedOrderId = (job?.order_id as string | undefined) ?? null;
  }

  if (!resolvedOrderId) {
    return NextResponse.json({ error: "Could not resolve internal order id" }, { status: 404 });
  }

  const { data: orderRow } = await supabaseAdmin
    .from("orders")
    .select("id,email")
    .eq("id", resolvedOrderId)
    .maybeSingle();

  const emailTo = (orderRow?.email as string | undefined) ?? null;
  const sendEmail = Boolean(body?.sendEmail ?? false);

  let totalUpserted = 0;
  let totalEmailed = 0;

  const debug: any = {
    storeIdUsed: printfulStoreId || null,
    example: null,
  };

  for (let i = 0; i < printfulOrderIds.length; i++) {
    const pfId = printfulOrderIds[i];
    const shipments = await fetchPrintfulShipments(pfId);

    if (i === 0) {
      const s0 = shipments[0] ?? null;
      debug.example = s0
        ? {
            printfulOrderId: pfId,
            printfulShipmentId: s0.shipmentId,
            rawShippedAt: s0.rawShippedAt ?? null,
            shippedAtComputed: s0.shippedAt ?? null,
            rawDeliveredAt: s0.rawDeliveredAt ?? null,
            deliveredAtComputed: s0.deliveredAt ?? null,
          }
        : { printfulOrderId: pfId, shipmentsFound: 0 };
    }

    for (const s of shipments) {
      const upsertRow = {
        order_id: resolvedOrderId,
        printful_order_id: pfId,
        printful_shipment_id: s.shipmentId,
        status: s.status ?? null,
        carrier: s.carrier ?? null,
        service: s.service ?? null,
        tracking_number: s.trackingNumber ?? null,
        tracking_url: s.trackingUrl ?? null,
        shipped_at: s.shippedAt ?? null,
        delivered_at: s.deliveredAt ?? null,
        reshipment: Boolean(s.reshipment ?? false),
        last_event_at: new Date().toISOString(),
        raw_payload: {
          source: "manual_sync",
          fetched_at: new Date().toISOString(),
          raw_shipped_at: s.rawShippedAt ?? null,
          raw_delivered_at: s.rawDeliveredAt ?? null,
        },
      };

      const { data: upserted, error: upsertErr } = await supabaseAdmin
        .from("order_shipments")
        .upsert(upsertRow, { onConflict: "order_id,printful_shipment_id" })
        .select("id,tracking_email_sent_at")
        .maybeSingle();

      if (upsertErr) {
        console.error("[sync-tracking] Upsert failed", upsertErr);
        continue;
      }

      totalUpserted += 1;

      const alreadySent = Boolean(upserted?.tracking_email_sent_at);

      if (sendEmail && emailTo && !alreadySent) {
        try {
          await sendTrackingEmail({
            to: emailTo,
            orderId: resolvedOrderId,
            trackingUrl: s.trackingUrl ?? null,
            trackingNumber: s.trackingNumber ?? null,
          });

          await supabaseAdmin
            .from("order_shipments")
            .update({ tracking_email_sent_at: new Date().toISOString() })
            .eq("id", upserted?.id);

          totalEmailed += 1;
        } catch (err) {
          console.error("[sync-tracking] Email send failed", err);
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    orderId: resolvedOrderId,
    printfulOrderIds,
    shipmentsUpserted: totalUpserted,
    emailsSent: totalEmailed,
    emailEnabled: sendEmail,
    storeIdUsed: printfulStoreId || null,
    debug,
  });
}
