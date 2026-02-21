// app/api/stripewebhook/route.ts

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createPrintfulOrderForCards } from "@/lib/printful";
import { CARD_TEMPLATES } from "@/lib/cardTemplates";
import QRCode from "qrcode";
import sharp from "sharp";
import path from "path";
import crypto from "node:crypto";
import { absoluteUrl } from "@/lib/siteUrl";

function getSupabaseAdmin(): SupabaseClient | null {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!supabaseUrl || !supabaseServiceKey) return null;

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

function getStripe(): Stripe | null {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY ?? "";
  if (!stripeSecretKey) return null;
  return new Stripe(stripeSecretKey);
}

function formatMoney(minorUnits: number, currency: string) {
  const amount = (minorUnits ?? 0) / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (currency || "usd").toUpperCase(),
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, rej) => {
      setTimeout(() => rej(new Error("timeout")), ms);
    }),
  ]);
}

const MAX_CLAIM_PIN_ATTEMPTS = 5;

function normalizePinLast4(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return /^\d{4}$/.test(s) ? s : null;
}

function hashClaimPinLast4(
  pinLast4: string,
): { hash: string | null; error?: string } {
  const salt = process.env.CLAIM_PIN_SALT ?? "";
  if (!salt) return { hash: null, error: "CLAIM_PIN_SALT is not configured" };
  const hash = crypto.createHmac("sha256", salt).update(pinLast4).digest("hex");
  return { hash };
}

type MailLineItem = { description: string; quantity: number };

async function getCheckoutLineItems(
  stripe: Stripe,
  sessionId: string,
): Promise<MailLineItem[]> {
  try {
    const li = await stripe.checkout.sessions.listLineItems(sessionId, {
      limit: 100,
    });

    return (li.data || [])
      .map((x) => ({
        description: x.description ?? "Item",
        quantity: x.quantity ?? 1,
      }))
      .filter((x) => x.quantity > 0);
  } catch (err) {
    console.error("[orderEmail] Failed to fetch Stripe line items", err);
    return [];
  }
}

type ShipAddr = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

function formatAddressLines(addr: ShipAddr | null | undefined): string[] {
  if (!addr) return [];
  const line1 = addr.line1 ?? "";
  const line2 = addr.line2 ?? "";
  const city = addr.city ?? "";
  const state = addr.state ?? "";
  const postal = addr.postal_code ?? "";
  const country = addr.country ?? "";

  const lines: string[] = [];
  if (line1) lines.push(line1);
  if (line2) lines.push(line2);

  const cityStatePostal = [city, state, postal].filter(Boolean).join(", ");
  if (cityStatePostal) lines.push(cityStatePostal);

  if (country) lines.push(country);

  return lines;
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

type MetadataCartItem = {
  templateId?: string;
  size?: string;
  quantity?: number;
};

function readCartItemsFromMetadata(
  metadata: Record<string, string | undefined>,
): MetadataCartItem[] {
  try {
    const chunkCountRaw =
      metadata.itemsChunkCount ??
      metadata.items_chunk_count ??
      metadata.items_chunkcount ??
      "0";

    const chunkCount = Number(chunkCountRaw);
    if (Number.isFinite(chunkCount) && chunkCount > 0) {
      const out: MetadataCartItem[] = [];
      for (let i = 0; i < chunkCount; i++) {
        const raw = metadata[`items_${i}`];
        if (!raw) continue;
        const parsed = JSON.parse(raw) as MetadataCartItem[];
        if (Array.isArray(parsed)) out.push(...parsed);
      }
      return out;
    }

    const raw = metadata.items ?? "";
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MetadataCartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function summarizeCartItems(metadata: Record<string, string | undefined>) {
  const parsed = readCartItemsFromMetadata(metadata);
  if (!Array.isArray(parsed) || parsed.length === 0) return [];

  const counts = new Map<
    string,
    { templateId: string | null; size: string | null; qty: number }
  >();

  for (const item of parsed) {
    const qty = Number(item.quantity ?? 0);
    if (!Number.isFinite(qty) || qty <= 0) continue;

    const templateId =
      typeof item.templateId === "string" ? item.templateId : null;
    const size = typeof item.size === "string" ? item.size : null;

    const key = `${templateId ?? "unknown"}|${size ?? "unknown"}`;
    const cur = counts.get(key);
    if (cur) cur.qty += qty;
    else counts.set(key, { templateId, size, qty });
  }

  const lines: string[] = [];
  for (const entry of counts.values()) {
    const tpl = entry.templateId
      ? CARD_TEMPLATES.find((t) => t.id === entry.templateId)
      : null;

    const name = tpl?.name ?? (entry.templateId ?? "GiftLink card");
    const sizeLabel = entry.size ?? tpl?.size ?? "";
    const sizePart = sizeLabel ? ` (${sizeLabel})` : "";
    lines.push(`${name}${sizePart} Qty ${entry.qty}`);
  }

  return lines;
}

async function sendOrderConfirmationEmail(args: {
  to: string;
  orderId: string;
  sessionId: string;
  customerName?: string | null;
  shippingName?: string | null;
  shippingAddress?: ShipAddr | null;
  amountTotalMinor: number;
  currency: string;
  itemLines: string[];
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

  let nodemailerAny: any;
  try {
    const mod: any = await import("nodemailer");
    nodemailerAny = mod?.default ?? mod;
  } catch {
    throw new Error("nodemailer is not installed, run npm i nodemailer");
  }

  if (!nodemailerAny?.createTransport) {
    throw new Error("nodemailer import failed, createTransport missing");
  }

  const transporter = nodemailerAny.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 6000,
    greetingTimeout: 6000,
    socketTimeout: 10000,
  });

  const customerName = (args.customerName ?? "").trim();
  const shippingName = (args.shippingName ?? "").trim();

  let greetingName = shippingName || customerName || "there";

  if (
    shippingName &&
    customerName &&
    shippingName.toLowerCase() !== customerName.toLowerCase()
  ) {
    greetingName = shippingName;
  }

  const total = formatMoney(args.amountTotalMinor, args.currency);

  const addressLines = formatAddressLines(args.shippingAddress);

  const itemsHtml =
    args.itemLines.length > 0
      ? `<ul>${args.itemLines
          .map((x) => `<li>${escapeHtml(x)}</li>`)
          .join("")}</ul>`
      : `<p>GiftLink cards</p>`;

  const shipHtml =
    addressLines.length > 0
      ? `<p>${escapeHtml(args.shippingName || "")}<br/>${addressLines
          .map((l) => escapeHtml(l))
          .join("<br/>")}</p>`
      : `<p>Shipping address captured at checkout.</p>`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>Thanks, ${escapeHtml(greetingName)}!</h2>
      <p>We have received your GiftLink order and are currently fullfilling it. Tracking information will be sent when available.</p>

      <p><strong>Order ID:</strong> ${escapeHtml(args.orderId)}</p>
      <p><strong>Total:</strong> ${escapeHtml(total)}</p>

      <h3>Items</h3>
      ${itemsHtml}

      <h3>Shipping</h3>
      ${shipHtml}

      <p style="margin-top: 24px;">
        If you have any questions, please contact us at Admin@GiftLink.cards.
      </p>
      <p style="color: #666; font-size: 12px;">
        GiftLink, giftlink.cards
      </p>
    </div>
  `;

  const mail: any = {
    from,
    to: args.to,
    subject: "Your GiftLink order confirmation",
    html,
  };

  if (replyTo) mail.replyTo = replyTo;

  await transporter.sendMail(mail);
  console.log("[orderEmail] Sent order confirmation to", args.to);
}

async function recordEmailSuccess(
  supabaseAdmin: SupabaseClient,
  orderId: string,
) {
  try {
    const { error } = await supabaseAdmin
      .from("orders")
      .update({
        confirmation_email_sent_at: new Date().toISOString(),
        confirmation_email_error: null,
      })
      .eq("id", orderId);

    if (error) console.error("[orderEmail] Failed to record success", error);
  } catch (err) {
    console.error("[orderEmail] Failed to record success", err);
  }
}

async function recordEmailFailure(
  supabaseAdmin: SupabaseClient,
  orderId: string,
  message: string,
) {
  try {
    const trimmed = message.slice(0, 500);
    const { error } = await supabaseAdmin
      .from("orders")
      .update({
        confirmation_email_sent_at: null,
        confirmation_email_error: trimmed,
      })
      .eq("id", orderId);

    if (error) console.error("[orderEmail] Failed to record failure", error);
  } catch (err) {
    console.error("[orderEmail] Failed to record failure", err);
  }
}

async function maybeSendAndRecordOrderEmail(args: {
  supabaseAdmin: SupabaseClient;
  stripe: Stripe;
  session: Stripe.Checkout.Session;
  orderId: string;
  customerEmail: string;
  customerName: string | null;
  shippingName: string | null;
  shippingAddress: ShipAddr | null;
}) {
  const { supabaseAdmin, stripe, session, orderId } = args;

  try {
    const { data: row, error: readErr } = await supabaseAdmin
      .from("orders")
      .select("confirmation_email_sent_at")
      .eq("id", orderId)
      .maybeSingle();

    if (readErr) {
      console.error("[orderEmail] Could not read confirmation status", readErr);
    }

    const alreadySent = Boolean((row as any)?.confirmation_email_sent_at);
    if (alreadySent) {
      console.log("[orderEmail] Already recorded as sent, skipping", { orderId });
      return;
    }
  } catch (err) {
    console.error("[orderEmail] Error checking send status, continuing", err);
  }

  try {
    const meta = (session.metadata ?? {}) as Record<string, string | undefined>;
    let itemLines = summarizeCartItems(meta);

    if (itemLines.length === 0) {
      const lineItems = await getCheckoutLineItems(stripe, session.id);
      itemLines = lineItems.map((x) => `${x.description} Qty ${x.quantity}`);
    }

    await withTimeout(
      sendOrderConfirmationEmail({
        to: args.customerEmail,
        orderId,
        sessionId: session.id,
        customerName: args.customerName,
        shippingName: args.shippingName,
        shippingAddress: args.shippingAddress,
        amountTotalMinor: session.amount_total ?? 0,
        currency: session.currency ?? "usd",
        itemLines,
      }),
      6500,
    );

    await recordEmailSuccess(supabaseAdmin, orderId);
  } catch (err: any) {
    const msg = typeof err?.message === "string" ? err.message : String(err);
    console.error("[orderEmail] Send attempt failed", msg);
    await recordEmailFailure(supabaseAdmin, orderId, msg);
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function argMaxInRange(arr: Int32Array, start: number, end: number) {
  let bestIdx: number | null = null;
  let bestVal = -1;
  for (let i = start; i < end; i++) {
    const v = arr[i] ?? 0;
    if (v > bestVal) {
      bestVal = v;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function findTwoEdgeClusters(scores: Int32Array) {
  let max = 0;
  for (let i = 0; i < scores.length; i++) max = Math.max(max, scores[i] ?? 0);
  if (max <= 0)
    return {
      leftEdge: null as number | null,
      rightEdge: null as number | null,
    };

  const thr = Math.floor(max * 0.7);

  const hits: number[] = [];
  for (let i = 0; i < scores.length; i++) {
    if ((scores[i] ?? 0) >= thr) hits.push(i);
  }

  if (hits.length < 2) return { leftEdge: null, rightEdge: null };

  const clusters: Array<{ start: number; end: number }> = [];
  let s = hits[0];
  let p = hits[0];
  for (let k = 1; k < hits.length; k++) {
    const x = hits[k];
    if (x === p + 1) {
      p = x;
    } else {
      clusters.push({ start: s, end: p });
      s = p = x;
    }
  }
  clusters.push({ start: s, end: p });

  if (clusters.length < 2) return { leftEdge: null, rightEdge: null };

  const left = clusters[0];
  const right = clusters[clusters.length - 1];

  return {
    leftEdge: left.start,
    rightEdge: right.end,
  };
}

async function detectGiftBoxWindow(
  templatePath: string,
  width: number,
  height: number,
): Promise<{ cx: number; cy: number; size: number }> {
  const { data, info } = await sharp(templatePath)
    .resize(width, height)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;

  const tr = 186;
  const tg = 230;
  const tb = 253;

  const yBandTop = Math.floor(h * 0.65);
  const yBandMid = Math.floor(h * 0.78);
  const yBandBot = Math.floor(h * 0.92);

  const colScores = new Int32Array(w);
  for (let y = yBandMid; y < Math.floor(h * 0.83); y++) {
    const rowOff = y * w * 4;
    for (let x = 0; x < w; x++) {
      const i = rowOff + x * 4;
      const a = data[i + 3];
      if (a < 10) continue;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const dr = r - tr;
      const dg = g - tg;
      const db = b - tb;

      const d2 = dr * dr + dg * dg + db * db;
      if (d2 < 60 * 60) colScores[x] += 1;
    }
  }

  const { leftEdge, rightEdge } = findTwoEdgeClusters(colScores);
  if (leftEdge == null || rightEdge == null || rightEdge - leftEdge < 120) {
    return { cx: w / 2, cy: h * 0.78, size: 240 };
  }

  const x0 = Math.max(0, leftEdge);
  const x1 = Math.min(w - 1, rightEdge);

  const rowScores = new Int32Array(h);
  for (let y = yBandTop; y < yBandBot; y++) {
    const rowOff = y * w * 4;
    for (let x = x0; x <= x1; x++) {
      const i = rowOff + x * 4;
      const a = data[i + 3];
      if (a < 10) continue;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const dr = r - tr;
      const dg = g - tg;
      const db = b - tb;

      const d2 = dr * dr + dg * dg + db * db;
      if (d2 < 60 * 60) rowScores[y] += 1;
    }
  }

  const topEdge = argMaxInRange(rowScores, yBandTop, yBandMid);
  const bottomEdge = argMaxInRange(rowScores, yBandMid, yBandBot);

  if (topEdge == null || bottomEdge == null || bottomEdge - topEdge < 120) {
    return { cx: (x0 + x1) / 2, cy: h * 0.78, size: 240 };
  }

  const inset = 14;
  const innerW = Math.max(80, x1 - x0 - inset * 2);
  const innerH = Math.max(80, bottomEdge - topEdge - inset * 2);
  const innerSize = Math.min(innerW, innerH);

  return {
    cx: (x0 + x1) / 2,
    cy: (topEdge + bottomEdge) / 2,
    size: innerSize,
  };
}

// PNG generator: base image plus QR centered inside gift box
async function generateGiftlinkInsidePng(cardId: string) {
  const WIDTH = 1245;
  const HEIGHT = 1845;

  const cardUrl = absoluteUrl(`/card/${cardId}`);

  const templatePath = path.join(
    process.cwd(),
    "public",
    "print-templates",
    "inside-right-base.png",
  );

  const box = await detectGiftBoxWindow(templatePath, WIDTH, HEIGHT);

  const qrSize = clamp(Math.floor(box.size * 0.9), 180, 360);

  const qrBuffer = await QRCode.toBuffer(cardUrl, {
    width: qrSize,
    margin: 4,
    errorCorrectionLevel: "H",
    color: { dark: "#000000", light: "#FFFFFF" },
  });

  const qrLeft = Math.round(box.cx - qrSize / 2);
  const qrTop = Math.round(box.cy - qrSize / 2);

  const whitePlate = await sharp({
    create: {
      width: qrSize,
      height: qrSize,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const resultBuffer = await sharp(templatePath)
    .resize(WIDTH, HEIGHT)
    .composite([
      { input: whitePlate, left: qrLeft, top: qrTop },
      { input: qrBuffer, left: qrLeft, top: qrTop },
    ])
    .png()
    .toBuffer();

  return resultBuffer;
}

export async function POST(req: NextRequest) {
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  const stripe = getStripe();

  if (!stripe || !stripeWebhookSecret) {
    console.error("Stripe env vars are missing");
    return new NextResponse("Stripe not configured", { status: 500 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    console.error(
      "Supabase admin client not configured, missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
    return new NextResponse("Supabase not configured", { status: 500 });
  }

  let event: Stripe.Event;

  const headerName = "stripe" + String.fromCharCode(45) + "signature";
  const signature = req.headers.get(headerName);
  const rawBody = await req.text();

  if (!signature) {
    return new NextResponse("Missing Stripe signature header", { status: 400 });
  }

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      stripeWebhookSecret,
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return new NextResponse("Webhook Error", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = (session.metadata ?? {}) as Record<string, string | undefined>;
    const type = metadata.type;

    try {
      if (type === "card_pack_order") {
        console.log("Handling card_pack_order for session", session.id);

        const customerDetails = session.customer_details as
          | {
              email?: string | null;
              name?: string | null;
              address?: ShipAddr | null;
            }
          | null
          | undefined;

        let shippingName: string | null = customerDetails?.name ?? null;
        let shippingAddress: ShipAddr | null = customerDetails?.address ?? null;

        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id;

        if (paymentIntentId) {
          try {
            const paymentIntent = await stripe.paymentIntents.retrieve(
              paymentIntentId,
            );
            const piShipping = paymentIntent.shipping as
              | { name?: string | null; address?: ShipAddr | null }
              | null
              | undefined;

            if (piShipping) {
              shippingName = piShipping.name ?? shippingName;
              shippingAddress = (piShipping.address ?? shippingAddress) || null;
            }
          } catch (err) {
            console.error(
              "Could not retrieve payment intent for shipping details",
              err,
            );
          }
        }

        const items =
          metadata.product != null
            ? [{ product: metadata.product, quantity: 1 }]
            : null;

        const rawPackQuantity =
          metadata.packQuantity ??
          metadata.pack_quantity ??
          metadata.quantity ??
          null;

        let packQuantity = 1;
        if (rawPackQuantity != null) {
          const parsed = Number(rawPackQuantity);
          if (!Number.isNaN(parsed) && parsed > 0) packQuantity = parsed;
        }

        let orderId: string | null = null;

        const { data: insertedOrder, error: orderInsertError } = await supabaseAdmin
          .from("orders")
          .insert({
            stripe_session_id: session.id,
            email: customerDetails?.email ?? null,

            shipping_name: shippingName,
            shipping_address_line1: shippingAddress?.line1 ?? null,
            shipping_address_line2: shippingAddress?.line2 ?? null,
            shipping_city: shippingAddress?.city ?? null,
            shipping_state: shippingAddress?.state ?? null,
            shipping_postal_code: shippingAddress?.postal_code ?? null,
            shipping_country: shippingAddress?.country ?? null,

            items,
            amount_total: session.amount_total ?? 0,
            status: "paid",
          })
          .select("id")
          .single();

        if (orderInsertError) {
          if (orderInsertError.code === "23505") {
            console.log(
              "Order already exists for session, reusing existing order row",
              session.id,
            );

            const { data: existingOrder, error: existingOrderError } = await supabaseAdmin
              .from("orders")
              .select("id")
              .eq("stripe_session_id", session.id)
              .maybeSingle();

            if (existingOrderError || !existingOrder) {
              console.error(
                "Could not fetch existing order after unique violation",
                existingOrderError,
              );
              return new NextResponse("Supabase order lookup error", {
                status: 500,
              });
            }

            orderId = existingOrder.id;
          } else {
            console.error("Error inserting order", orderInsertError);
            return new NextResponse("Supabase insert error", { status: 500 });
          }
        } else if (insertedOrder) {
          orderId = insertedOrder.id;
        }

        if (!orderId) {
          console.error(
            "No orderId resolved after insert or lookup for session",
            session.id,
          );
          return new NextResponse("Order id missing", { status: 500 });
        }

        const customerEmail = customerDetails?.email ?? null;
        if (customerEmail) {
          await maybeSendAndRecordOrderEmail({
            supabaseAdmin,
            stripe,
            session,
            orderId,
            customerEmail,
            customerName: customerDetails?.name ?? null,
            shippingName,
            shippingAddress,
          });
        } else {
          console.log("[orderEmail] No customer email, skipping", { orderId });
        }

        const templateAssignments: (string | null)[] = [];
        try {
          const parsedItems = readCartItemsFromMetadata(metadata);
          if (Array.isArray(parsedItems)) {
            for (const item of parsedItems) {
              const qty = Number(item.quantity ?? 0);
              const tid = item.templateId ?? null;
              if (!Number.isNaN(qty) && qty > 0) {
                for (let i = 0; i < qty; i++) templateAssignments.push(tid);
              }
            }
          }
        } catch (err) {
          console.error("Failed to parse metadata items JSON", err);
        }

        while (templateAssignments.length < packQuantity)
          templateAssignments.push(null);

        const cardsForPrintful: {
          cardId: string;
          storagePath: string;
          templateId: string | null;
        }[] = [];

        for (let i = 0; i < packQuantity; i++) {
          const cardId =
            (packQuantity === 1
              ? metadata.cardId ?? metadata.card_id
              : undefined) ??
            `card_${Math.random().toString(36).slice(2, 10)}`;

          const templateIdForThisCard = templateAssignments[i] ?? null;

          const { error: cardInsertError } = await supabaseAdmin
            .from("cards")
            .insert({
              card_id: cardId,
              giver_name: "Store card",
              amount: 0,
              note: null,
              claimed: false,
            });

          if (cardInsertError && cardInsertError.code !== "23505") {
            console.error(
              "Error inserting card for shop order",
              cardInsertError,
            );
            continue;
          }

          try {
            const pngBytes = await generateGiftlinkInsidePng(cardId);
            const pngPath = `cards/${cardId}.png`;

            const { error: uploadError } = await supabaseAdmin.storage
              .from("printfiles")
              .upload(pngPath, pngBytes, {
                contentType: "image/png",
                upsert: true,
              });

            const { data: publicUrlData } = supabaseAdmin.storage
              .from("printfiles")
              .getPublicUrl(pngPath);

            const publicUrl = publicUrlData?.publicUrl ?? null;

            console.log("[stripe-webhook] print file url", publicUrl);

            await supabaseAdmin
              .from("cards")
              .update({
                printed: uploadError ? false : true,
                print_file_url: publicUrl,
              })
              .eq("card_id", cardId);

            const { error: jobError } = await supabaseAdmin
              .from("card_print_jobs")
              .insert({
                card_id: cardId,
                order_id: orderId,
                pdf_path: pngPath,
                status: uploadError ? "error" : "generated",
                error_message: uploadError ? uploadError.message : null,
                fulfillment_status: "pending",
              });

            if (jobError) {
              console.error("Error inserting card_print_job row", jobError);
              continue;
            }

            if (!uploadError) {
              cardsForPrintful.push({
                cardId,
                storagePath: pngPath,
                templateId: templateIdForThisCard,
              });
            }
          } catch (err) {
            console.error(
              "Error generating or uploading print PNG for card",
              cardId,
              err,
            );
          }
        }

        if (cardsForPrintful.length > 0) {
          try {
            const printfulResult = await createPrintfulOrderForCards({
              orderId,
              cards: cardsForPrintful,
            });

            console.log(
              "Created Printful order from webhook",
              printfulResult.printfulOrderId,
              printfulResult.status,
            );
          } catch (err) {
            console.error("Failed to create Printful order from webhook", err);
          }
        } else {
          console.error(
            "No cards were successfully uploaded to storage; skipping Printful order creation",
          );
        }
      } else {
        const cardId = metadata.cardId ?? metadata.card_id;
        const giverName = metadata.giverName ?? metadata.giver_name ?? "";
        const note = metadata.note ?? "";

        const pinLast4Raw =
          metadata.pinLast4 ??
          metadata.pin_last4 ??
          metadata.claimPinLast4 ??
          metadata.claim_pin_last4 ??
          null;

        const pinLast4 = normalizePinLast4(pinLast4Raw);

        let claimPinHash: string | null = null;
        let claimPinLocked = false;
        let claimPinAttempts = 0;

        if (!pinLast4) {
          claimPinLocked = true;
          claimPinAttempts = MAX_CLAIM_PIN_ATTEMPTS;
          console.error(
            "[stripe-webhook] Missing or invalid pinLast4 in session metadata",
            { sessionId: session.id, cardId },
          );
        } else {
          const hashed = hashClaimPinLast4(pinLast4);
          if (!hashed.hash) {
            claimPinLocked = true;
            claimPinAttempts = MAX_CLAIM_PIN_ATTEMPTS;
            console.error("[stripe-webhook] Could not hash pinLast4, locking card", {
              sessionId: session.id,
              cardId,
              error: hashed.error,
            });
          } else {
            claimPinHash = hashed.hash;
          }
        }

        const giftAmountRaw =
          metadata.giftAmountRaw ??
          metadata.giftAmount ??
          metadata.gift_amount ??
          null;
        const feeAmountRaw =
          metadata.feeAmountRaw ??
          metadata.feeAmount ??
          metadata.fee_amount ??
          null;
        const totalChargeRaw =
          metadata.totalChargeRaw ??
          metadata.totalCharge ??
          metadata.total_charge ??
          null;

        let giftAmount: number | null = null;

        if (giftAmountRaw != null) {
          const parsed = Number(giftAmountRaw);
          if (!Number.isNaN(parsed) && parsed > 0) giftAmount = parsed;
        }

        if (
          giftAmount == null &&
          totalChargeRaw != null &&
          feeAmountRaw != null
        ) {
          const totalParsed = Number(totalChargeRaw);
          const feeParsed = Number(feeAmountRaw);
          if (
            !Number.isNaN(totalParsed) &&
            !Number.isNaN(feeParsed) &&
            totalParsed > feeParsed
          ) {
            giftAmount = totalParsed - feeParsed;
          }
        }

        if (giftAmount == null && session.amount_total != null) {
          giftAmount = session.amount_total / 100;
        }

        if (!cardId || giftAmount == null) {
          console.error("Missing cardId or gift amount for gift load", {
            cardId,
            giftAmountRaw,
            totalChargeRaw,
            feeAmountRaw,
          });
          return new NextResponse("Missing metadata", { status: 400 });
        }

        const { error } = await supabaseAdmin
          .from("cards")
          .update({
            giver_name: giverName,
            amount: giftAmount,
            note,
            funded: true,
            claim_pin_hash: claimPinHash,
            claim_pin_attempts: claimPinAttempts,
            claim_pin_locked: claimPinLocked,
          })
          .eq("card_id", cardId);

        if (error) {
          console.error("Error updating card for gift load", error);
          return new NextResponse("Supabase update error", { status: 500 });
        }

        console.log("Gift load completed", {
          cardId,
          giverName,
          giftAmount,
          giftAmountRaw,
          feeAmountRaw,
          totalChargeRaw,
          amountTotalFromStripe: session.amount_total,
        });
      }
    } catch (err) {
      console.error("Error handling checkout.session.completed", err);
      return new NextResponse("Handler error", { status: 500 });
    }
  }

  return new NextResponse("ok", { status: 200 });
}