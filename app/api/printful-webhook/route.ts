// app/api/printful-webhook/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const printfulToken = process.env.PRINTFUL_API_KEY ?? "";
const printfulStoreId = process.env.PRINTFUL_STORE_ID ?? "";

const supabaseAdmin =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { persistSession: false },
      })
    : null;

type PrintfulShipment = {
  shipmentId: string;
  status?: string | null;
  carrier?: string | null;
  service?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  reshipment?: boolean;
};

function toIsoOrNull(v: any): string | null {
  if (v === null || v === undefined) return null;

  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;

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

function normalizeEventType(v: any): string {
  return String(v ?? "").trim();
}

function normalizeStatus(v: any): string {
  return String(v ?? "").trim().toLowerCase();
}

function inferFulfillmentStatus(
  eventType: string,
  orderStatus: string,
): string | null {
  const e = normalizeStatus(eventType);
  const s = normalizeStatus(orderStatus);

  if (e.includes("delivered")) return "delivered";
  if (e.includes("shipped")) return "shipped";

  if (s === "shipped") return "shipped";
  if (s === "delivered") return "delivered";

  return null;
}

function extractShipmentFromWebhookPayload(body: any): PrintfulShipment | null {
  const data = body?.data ?? {};
  const shipment =
    data?.shipment ?? data?.package ?? data?.shipment_data ?? data?.shipping ?? null;

  if (!shipment) return null;

  const shipmentId =
    shipment?.id ?? shipment?.shipment_id ?? shipment?.shipmentId ?? null;

  if (!shipmentId) return null;

  const trackingNumber =
    shipment?.tracking_number ?? shipment?.trackingNumber ?? shipment?.tracking ?? null;

  const trackingUrl =
    shipment?.tracking_url ??
    shipment?.trackingUrl ??
    shipment?.tracking_url_raw ??
    null;

  return {
    shipmentId: String(shipmentId),
    status: shipment?.status ? String(shipment.status) : null,
    carrier: shipment?.carrier ? String(shipment.carrier) : null,
    service: shipment?.service ? String(shipment.service) : null,
    trackingNumber: trackingNumber ? String(trackingNumber) : null,
    trackingUrl: trackingUrl ? String(trackingUrl) : null,
    shippedAt: toIsoOrNull(shipment?.shipped_at ?? shipment?.shippedAt),
    deliveredAt: toIsoOrNull(shipment?.delivered_at ?? shipment?.deliveredAt),
    reshipment: Boolean(shipment?.reshipment ?? false),
  };
}

async function fetchPrintfulOrderShipments(
  printfulOrderId: string | number,
): Promise<PrintfulShipment[]> {
  if (!printfulToken) return [];

  const url = `https://api.printful.com/orders/${encodeURIComponent(
    String(printfulOrderId),
  )}`;

  const resp = await fetch(url, {
    method: "GET",
    headers: buildPrintfulHeaders(),
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    console.warn(
      "[printful webhook] Failed to fetch Printful order for shipments",
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

      return {
        shipmentId: String(shipmentId),
        status: s?.status ? String(s.status) : null,
        carrier: s?.carrier ? String(s.carrier) : null,
        service: s?.service ? String(s.service) : null,
        trackingNumber: s?.tracking_number ? String(s.tracking_number) : null,
        trackingUrl: s?.tracking_url ? String(s.tracking_url) : null,
        shippedAt: toIsoOrNull(s?.shipped_at),
        deliveredAt: toIsoOrNull(s?.delivered_at),
        reshipment: Boolean(s?.reshipment ?? false),
      } as PrintfulShipment;
    })
    .filter(Boolean) as PrintfulShipment[];
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
    throw new Error("SMTP env not configured for Zoho");
  }

  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("Invalid ZOHO_SMTP_PORT");
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
      : "Tracking: (not provided yet)";

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
    console.error(
      "[printful webhook] Supabase server environment variables are not configured",
    );
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    console.error("[printful webhook] Failed to parse JSON body", err);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = normalizeEventType(body?.type);
  const data = body?.data ?? {};
  const order = data?.order ?? null;

  const printfulOrderId = (order?.id ??
    data?.order_id ??
    data?.orderId) as number | string | undefined;
  const orderStatus = (order?.status ?? data?.status) as string | undefined;

  if (!eventType) {
    console.error("[printful webhook] Missing event type");
    return NextResponse.json({ received: true });
  }

  if (!printfulOrderId) {
    console.log("[printful webhook] No order id in payload, nothing to update");
    return NextResponse.json({ received: true });
  }

  console.log(
    "[printful webhook] Received event",
    eventType,
    "for order",
    printfulOrderId,
    "status",
    orderStatus,
  );

  const fulfillmentStatus = inferFulfillmentStatus(eventType, orderStatus ?? "");

  const updates: Record<string, any> = {
    printful_status: orderStatus ?? eventType,
  };

  if (fulfillmentStatus) {
    updates.fulfillment_status = fulfillmentStatus;
  }

  const { data: updatedJobs, error: updateError } = await supabaseAdmin
    .from("card_print_jobs")
    .update(updates)
    .eq("printful_order_id", printfulOrderId)
    .select("id, order_id");

  if (updateError) {
    console.error("[printful webhook] Error updating card_print_jobs", updateError);
    return NextResponse.json({ error: "Failed to update print job" }, { status: 500 });
  }

  if (!updatedJobs || updatedJobs.length === 0) {
    console.warn(
      "[printful webhook] No card_print_jobs row found for printful_order_id",
      printfulOrderId,
    );
    return NextResponse.json({ received: true });
  }

  const orderId = updatedJobs
    .map((j: any) => j.order_id)
    .find((v: any) => Boolean(v)) as string | undefined;

  if (!orderId) {
    console.warn(
      "[printful webhook] Found jobs but no order_id, cannot save shipment tracking",
    );
    return NextResponse.json({ received: true });
  }

  const shouldTryShipments =
    normalizeStatus(eventType).includes("shipped") ||
    normalizeStatus(eventType).includes("delivered") ||
    normalizeStatus(orderStatus).includes("shipped") ||
    normalizeStatus(orderStatus).includes("fulfilled") ||
    normalizeStatus(orderStatus).includes("delivered");

  if (!shouldTryShipments) {
    return NextResponse.json({ received: true });
  }

  let shipments: PrintfulShipment[] = [];
  const payloadShipment = extractShipmentFromWebhookPayload(body);
  if (payloadShipment) shipments = [payloadShipment];

  if (shipments.length === 0) {
    shipments = await fetchPrintfulOrderShipments(printfulOrderId);
  }

  if (shipments.length === 0) {
    console.log(
      "[printful webhook] No shipments found yet for Printful order",
      printfulOrderId,
    );
    return NextResponse.json({ received: true });
  }

  const { data: orderRow, error: orderErr } = await supabaseAdmin
    .from("orders")
    .select("id,email")
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr) {
    console.error("[printful webhook] Failed to load order for email", orderErr);
  }

  for (const s of shipments) {
    const upsertRow = {
      order_id: orderId,
      printful_order_id: String(printfulOrderId),
      printful_shipment_id: s.shipmentId,
      status: s.status ?? fulfillmentStatus ?? null,
      carrier: s.carrier ?? null,
      service: s.service ?? null,
      tracking_number: s.trackingNumber ?? null,
      tracking_url: s.trackingUrl ?? null,
      shipped_at: s.shippedAt ?? null,
      delivered_at: s.deliveredAt ?? null,
      reshipment: Boolean(s.reshipment ?? false),
      last_event_at: new Date().toISOString(),
      raw_payload: body,
    };

    const { data: upserted, error: upsertErr } = await supabaseAdmin
      .from("order_shipments")
      .upsert(upsertRow, { onConflict: "order_id,printful_shipment_id" })
      .select("id,tracking_email_sent_at")
      .maybeSingle();

    if (upsertErr) {
      console.error("[printful webhook] Failed to upsert order_shipments", upsertErr);
      continue;
    }

    const alreadyEmailed = Boolean(upserted?.tracking_email_sent_at);
    const emailTo = (orderRow?.email as string | undefined) ?? null;

    if (!alreadyEmailed && emailTo) {
      try {
        await sendTrackingEmail({
          to: emailTo,
          orderId,
          trackingUrl: s.trackingUrl ?? null,
          trackingNumber: s.trackingNumber ?? null,
        });

        await supabaseAdmin
          .from("order_shipments")
          .update({ tracking_email_sent_at: new Date().toISOString() })
          .eq("id", upserted?.id);

        console.log(
          "[printful webhook] Tracking email sent for shipment",
          s.shipmentId,
        );
      } catch (err) {
        console.error("[printful webhook] Tracking email failed", err);
      }
    }
  }

  return NextResponse.json({ received: true });
}
