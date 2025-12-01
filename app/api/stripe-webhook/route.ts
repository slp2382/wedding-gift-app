import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createPrintfulOrderForCards } from "@/lib/printful";

const TTL_SECONDS = 60 * 60 * 12;

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

async function sendOrderConfirmationEmail(args: {
  to: string;
  orderId: string;
  sessionId: string;
  customerName?: string | null;
  shippingName?: string | null;
  shippingAddress?: ShipAddr | null;
  amountTotalMinor: number;
  currency: string;
  lineItems: MailLineItem[];
}) {
  const host = process.env.ZOHO_SMTP_HOST ?? "";
  const portRaw = process.env.ZOHO_SMTP_PORT ?? "";
  const user = process.env.ZOHO_SMTP_USER ?? "";
  const pass = process.env.ZOHO_SMTP_PASS ?? "";
  const from = process.env.MAIL_FROM ?? user;
  const replyTo = process.env.MAIL_REPLY_TO ?? "";

  if (!host || !portRaw || !user || !pass || !from) {
    console.warn("[orderEmail] SMTP env not configured, skipping email");
    return;
  }

  const port = Number(portRaw);
  const secure = port === 465;

  let nodemailer: any;
  try {
    nodemailer = await import("nodemailer");
  } catch (err) {
    console.error(
      "[orderEmail] nodemailer is not installed. Run: npm i nodemailer",
      err,
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 4000,
    greetingTimeout: 4000,
    socketTimeout: 6000,
  });

  const greetingName = args.customerName || args.shippingName || "there";
  const total = formatMoney(args.amountTotalMinor, args.currency);

  const addressLines = formatAddressLines(args.shippingAddress);
  const itemsHtml =
    args.lineItems.length > 0
      ? `<ul>${args.lineItems
          .map(
            (x) =>
              `<li>${escapeHtml(x.description)} (Qty ${x.quantity})</li>`,
          )
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
      <p>We have received your GiftLink order.</p>

      <p><strong>Order ID:</strong> ${escapeHtml(args.orderId)}</p>
      <p><strong>Total:</strong> ${escapeHtml(total)}</p>

      <h3>Items</h3>
      ${itemsHtml}

      <h3>Shipping</h3>
      ${shipHtml}

      <p style="margin-top: 24px;">
        If you have any questions, reply to this email.
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

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// PNG generator: white background plus QR near bottom center
async function generateGiftlinkInsidePng(cardId: string) {
  const { createCanvas } = await import("canvas");
  const QRCode = (await import("qrcode")).default;

  // 4.15" x 6.15" at 300 DPI
  const WIDTH = 1245;
  const HEIGHT = 1845;

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const cardUrl = `https://www.giftlink.cards/card/${cardId}`;

  const qrBuffer = await QRCode.toBuffer(cardUrl, {
    width: 300,
    margin: 0,
  });

  const qrImage = await (await import("canvas")).loadImage(qrBuffer);

  const QR_SIZE = 300;
  const bottomMargin = 200;
  const centerX = WIDTH / 2;
  const startY = HEIGHT - bottomMargin - QR_SIZE;

  ctx.drawImage(qrImage, centerX - QR_SIZE / 2, startY, QR_SIZE, QR_SIZE);

  return canvas.toBuffer("image/png");
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
    event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
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
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            const piShipping = paymentIntent.shipping as
              | { name?: string | null; address?: ShipAddr | null }
              | null
              | undefined;
            if (piShipping) {
              shippingName = piShipping.name ?? shippingName;
              shippingAddress = (piShipping.address ?? shippingAddress) || null;
            }
          } catch (err) {
            console.error("Could not retrieve payment intent for shipping details", err);
          }
        }

        const items =
          metadata.product != null
            ? [{ product: metadata.product, quantity: 1 }]
            : null;

        const rawPackQuantity =
          metadata.packQuantity ?? metadata.pack_quantity ?? metadata.quantity ?? null;

        let packQuantity = 1;
        if (rawPackQuantity != null) {
          const parsed = Number(rawPackQuantity);
          if (!Number.isNaN(parsed) && parsed > 0) packQuantity = parsed;
        }

        let orderId: string | null = null;
        let isNewOrder = false;

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
            console.log("Order already exists for session, reusing existing order row", session.id);

            const { data: existingOrder, error: existingOrderError } = await supabaseAdmin
              .from("orders")
              .select("id")
              .eq("stripe_session_id", session.id)
              .maybeSingle();

            if (existingOrderError || !existingOrder) {
              console.error("Could not fetch existing order after unique violation", existingOrderError);
              return new NextResponse("Supabase order lookup error", { status: 500 });
            }

            orderId = existingOrder.id;
          } else {
            console.error("Error inserting order", orderInsertError);
            return new NextResponse("Supabase insert error", { status: 500 });
          }
        } else if (insertedOrder) {
          orderId = insertedOrder.id;
          isNewOrder = true;
        }

        if (!orderId) {
          console.error("No orderId resolved after insert or lookup for session", session.id);
          return new NextResponse("Order id missing", { status: 500 });
        }

        if (isNewOrder && customerDetails?.email) {
          const lineItems = await getCheckoutLineItems(stripe, session.id);
          try {
            await withTimeout(
              sendOrderConfirmationEmail({
                to: customerDetails.email,
                orderId,
                sessionId: session.id,
                customerName: customerDetails?.name ?? null,
                shippingName,
                shippingAddress,
                amountTotalMinor: session.amount_total ?? 0,
                currency: session.currency ?? "usd",
                lineItems,
              }),
              6500,
            );
          } catch (err) {
            console.error("[orderEmail] Send attempt failed", err);
          }
        }

        const templateAssignments: (string | null)[] = [];
        try {
          type MetadataItem = { templateId?: string; size?: string; quantity?: number };
          const metadataItemsRaw = metadata.items ?? "";
          if (metadataItemsRaw) {
            const parsed = JSON.parse(metadataItemsRaw) as MetadataItem[];
            if (Array.isArray(parsed)) {
              for (const item of parsed) {
                const qty = Number(item.quantity ?? 0);
                const tid = item.templateId ?? null;
                if (!Number.isNaN(qty) && qty > 0) {
                  for (let i = 0; i < qty; i++) templateAssignments.push(tid);
                }
              }
            }
          }
        } catch (err) {
          console.error("Failed to parse metadata.items JSON", err);
        }

        while (templateAssignments.length < packQuantity) templateAssignments.push(null);

        const cardsForPrintful: {
          cardId: string;
          storagePath: string;
          templateId: string | null;
        }[] = [];

        for (let i = 0; i < packQuantity; i++) {
          const cardId =
            (packQuantity === 1 ? metadata.cardId ?? metadata.card_id : undefined) ??
            `card_${Math.random().toString(36).slice(2, 10)}`;

          const templateIdForThisCard = templateAssignments[i] ?? null;

          const { error: cardInsertError } = await supabaseAdmin.from("cards").insert({
            card_id: cardId,
            giver_name: "Store card",
            amount: 0,
            note: null,
            claimed: false,
          });

          if (cardInsertError && cardInsertError.code !== "23505") {
            console.error("Error inserting card for shop order", cardInsertError);
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

            await supabaseAdmin
              .from("cards")
              .update({
                printed: uploadError ? false : true,
                print_file_url: publicUrl,
              })
              .eq("card_id", cardId);

            const { error: jobError } = await supabaseAdmin.from("card_print_jobs").insert({
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
            console.error("Error generating or uploading print PNG for card", cardId, err);
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
          console.error("No cards were successfully uploaded to storage; skipping Printful order creation");
        }
      } else {
        const cardId = metadata.cardId ?? metadata.card_id;
        const giverName = metadata.giverName ?? metadata.giver_name ?? "";
        const note = metadata.note ?? "";

        const giftAmountRaw =
          metadata.giftAmountRaw ?? metadata.giftAmount ?? metadata.gift_amount ?? null;
        const feeAmountRaw =
          metadata.feeAmountRaw ?? metadata.feeAmount ?? metadata.fee_amount ?? null;
        const totalChargeRaw =
          metadata.totalChargeRaw ?? metadata.totalCharge ?? metadata.total_charge ?? null;

        let giftAmount: number | null = null;

        if (giftAmountRaw != null) {
          const parsed = Number(giftAmountRaw);
          if (!Number.isNaN(parsed) && parsed > 0) giftAmount = parsed;
        }

        if (giftAmount == null && totalChargeRaw != null && feeAmountRaw != null) {
          const totalParsed = Number(totalChargeRaw);
          const feeParsed = Number(feeAmountRaw);
          if (!Number.isNaN(totalParsed) && !Number.isNaN(feeParsed) && totalParsed > feeParsed) {
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
