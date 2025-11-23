// app/api/stripe-webhook/route.ts

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import QRCode from "qrcode";
import { createCanvas, loadImage } from "canvas";
import { createPrintfulOrderForCards } from "@/lib/printful";
import { CARD_TEMPLATES } from "@/lib/cardTemplates";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const giftlinkBaseUrl =
  process.env.GIFTLINK_BASE_URL ?? "https://www.giftlink.cards";

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

const supabaseAdmin: any =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { persistSession: false },
      })
    : null;

// 4x6 only for now
type CardSize = "4x6";

async function generateGiftlinkInsidePng(
  cardId: string,
  size: CardSize = "4x6",
): Promise<Buffer> {
  const width = 1245; // about 4.15 in at 300 dpi
  const height = 1845; // about 6.15 in at 300 dpi

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const cardUrl = `${giftlinkBaseUrl}/card/${cardId}`;

  const qrSize = 300;
  const qrX = (width - qrSize) / 2;
  const qrY = height - qrSize - 260;

  const qrCanvas = createCanvas(qrSize, qrSize);
  const qrCtx = qrCanvas.getContext("2d");

  await new Promise<void>((resolve, reject) => {
    QRCode.toCanvas(
      qrCanvas,
      cardUrl,
      {
        errorCorrectionLevel: "H",
        margin: 0,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      },
      (err) => {
        if (err) return reject(err);
        resolve();
      },
    );
  });

  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  ctx.fillStyle = "#000000";
  ctx.font = "bold 40px Arial";
  ctx.textAlign = "center";

  const titleText = "Scan to see your gift";
  ctx.fillText(titleText, width / 2, qrY - 40);

  ctx.font = "28px Arial";
  ctx.fillText("Wedding gift powered by GiftLink", width / 2, qrY - 5);

  ctx.font = "24px Arial";
  ctx.fillText(
    "Keep this card safe until the wedding day",
    width / 2,
    qrY + qrSize + 120,
  );

  ctx.font = "22px Arial";
  ctx.fillText(
    "The couple scans the same QR to claim the gift",
    width / 2,
    qrY + qrSize + 155,
  );

  try {
    const logoPath = process.env.GIFTLINK_LOGO_PATH ?? "public/GLlogo.png";
    const logoImage = await loadImage(logoPath);
    const logoTargetWidth = 220;
    const aspect = logoImage.height / logoImage.width;
    const logoTargetHeight = logoTargetWidth * aspect;

    const logoX = (width - logoTargetWidth) / 2;
    const logoY = qrY + qrSize + 30;

    ctx.drawImage(
      logoImage,
      logoX,
      logoY,
      logoTargetWidth,
      logoTargetHeight,
    );
  } catch {
    // logo is optional
  }

  return canvas.toBuffer("image/png");
}

function resolvePackConfigForPriceId(priceId: string | null | undefined): {
  templateId: string;
  size: CardSize;
  packQuantity: number;
} | null {
  if (!priceId) return null;

  for (const template of CARD_TEMPLATES) {
    const entries = Object.entries(template.stripePrices ?? {}) as Array<
      [string, string]
    >;

    for (const [qtyStr, mappedPriceId] of entries) {
      if (mappedPriceId && mappedPriceId === priceId) {
        const packQuantity = Number(qtyStr) || 1; // 1, 3, 5
        const size: CardSize = "4x6";
        return {
          templateId: template.id,
          size,
          packQuantity,
        };
      }
    }
  }

  return null;
}

async function handleCardPackOrder(
  session: Stripe.Checkout.Session,
  stripeClient: Stripe,
) {
  if (!supabaseAdmin) {
    console.error("[stripewebhook] Supabase env vars missing in handler");
    return;
  }

  const stripeSessionId = session.id;
  const metadata = session.metadata || {};
  const type = metadata.type;

  if (type !== "card_pack_order") {
    console.log(
      "[stripewebhook] handleCardPackOrder called for non-card_pack_order type",
      type,
    );
    return;
  }

  console.log(
    "[stripewebhook] Handling card_pack_order for session",
    stripeSessionId,
  );

  // 1) Resolve or create order row and shipping
  let orderId: string | null = null;
  let hasValidShipping = false;

  try {
    const { data: existingOrder, error: existingOrderError } =
      await supabaseAdmin
        .from("orders")
        .select("id")
        .eq("stripe_session_id", stripeSessionId)
        .maybeSingle();

    if (existingOrderError) {
      console.error(
        "[stripewebhook] Error checking existing order",
        existingOrderError,
      );
    }

    if (existingOrder) {
      orderId = existingOrder.id;
      hasValidShipping = true;
    } else {
      let shipping: any =
        (session as any).shipping ??
        (session as any).shipping_details ??
        null;

      let email: string | null =
        session.customer_details?.email ??
        (session as any).customer_email ??
        null;

      // PaymentIntent fallback for shipping
      if (!shipping && session.payment_intent) {
        try {
          const piId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent.id;

          const pi = await stripeClient.paymentIntents.retrieve(piId);
          const piAny: any = pi;

          if (piAny.shipping) {
            shipping = piAny.shipping;
          } else if (piAny.charges?.data?.length) {
            const charge = piAny.charges.data[0];

            if (charge.shipping) {
              shipping = charge.shipping;
            }

            if (!email && charge.billing_details?.email) {
              email = charge.billing_details.email;
            }
          }
        } catch (piErr) {
          console.error(
            "[stripewebhook] Error retrieving PaymentIntent for shipping fallback",
            piErr,
          );
        }
      }

      const address: any = shipping?.address ?? null;

      if (
        address &&
        address.line1 &&
        address.postal_code &&
        address.country
      ) {
        hasValidShipping = true;
      } else {
        console.warn(
          "[stripewebhook] Missing or incomplete shipping details; cannot create Printful order",
          { shipping, address },
        );
      }

      const { data: newOrder, error: insertOrderError } =
        await supabaseAdmin
          .from("orders")
          .insert({
            stripe_session_id: stripeSessionId,
            email,
            shipping_name: shipping?.name ?? null,
            shipping_address_line1: address?.line1 ?? null,
            shipping_address_line2: address?.line2 ?? null,
            shipping_city: address?.city ?? null,
            shipping_state: address?.state ?? null,
            shipping_postal_code: address?.postal_code ?? null,
            shipping_country: address?.country ?? null,
            amount_total:
              typeof session.amount_total == "number"
                ? session.amount_total
                : null,
            status: session.payment_status ?? "paid",
          })
          .select("id")
          .single();

      if (insertOrderError || !newOrder) {
        console.error(
          "[stripewebhook] Error inserting order",
          insertOrderError,
        );
      } else {
        orderId = newOrder.id;
      }
    }
  } catch (orderErr) {
    console.error(
      "[stripewebhook] Unexpected error while handling order",
      orderErr,
    );
  }

  if (!orderId) {
    console.error(
      "[stripewebhook] Could not determine orderId for session; skipping card and print job creation",
      stripeSessionId,
    );
    return;
  }

  // 1.5) Idempotency guard: if card_print_jobs already exist for this order, skip
  try {
    const { data: existingJobs, error: jobsCheckError } = await supabaseAdmin
      .from("card_print_jobs")
      .select("id")
      .eq("order_id", orderId)
      .limit(1);

    if (jobsCheckError) {
      console.error(
        "[stripewebhook] Error checking existing card_print_jobs for order",
        jobsCheckError,
      );
    } else if (existingJobs && existingJobs.length > 0) {
      console.log(
        "[stripewebhook] card_print_jobs already exist for order; skipping duplicate processing",
        orderId,
      );
      return;
    }
  } catch (checkErr) {
    console.error(
      "[stripewebhook] Unexpected error checking card_print_jobs for order",
      checkErr,
    );
  }

  // 2) Fetch actual line items from Stripe
  let stripeLineItems: Stripe.ApiList<Stripe.LineItem> | null = null;
  try {
    stripeLineItems = await stripeClient.checkout.sessions.listLineItems(
      session.id,
      { limit: 100 },
    );
  } catch (err) {
    console.error(
      "[stripewebhook] Error listing Checkout Session line items",
      err,
    );
  }

  if (!stripeLineItems || stripeLineItems.data.length === 0) {
    console.warn(
      "[stripewebhook] No line items found for session, skipping card creation",
      stripeSessionId,
    );
    return;
  }

  const simpleLineItems = stripeLineItems.data.map((li) => ({
    price_id: li.price?.id as string | undefined,
    quantity: li.quantity ?? 1,
  }));

  console.log(
    "[stripewebhook] Resolved Stripe line items",
    simpleLineItems.map((li) => ({
      price_id: li.price_id,
      quantity: li.quantity,
    })),
  );

  // 3) Create card rows + PNGs + print jobs
  let totalCardsToCreate = 0;
  const allCardIds: string[] = [];

  for (const item of simpleLineItems) {
    const { price_id, quantity } = item;
    const qty = Number(quantity) || 1;
    const packConfig = resolvePackConfigForPriceId(price_id ?? null);

    if (!packConfig) {
      console.warn(
        "[stripewebhook] No packConfig resolved for price_id",
        price_id,
      );
      continue;
    }

    const { templateId, packQuantity } = packConfig;
    const cardsForThisLine = packQuantity * qty;
    totalCardsToCreate += cardsForThisLine;

    console.log(
      "[stripewebhook] Creating cards for template",
      templateId,
      "packQuantity",
      packQuantity,
      "cart quantity",
      qty,
      "cardsForThisLine",
      cardsForThisLine,
    );

    // Generate one card per physical card in the pack
    for (let i = 0; i < cardsForThisLine; i++) {
      const cardId = `card_${randomUUID()
        .replace(/-/g, "")
        .slice(0, 8)}`;

      allCardIds.push(cardId);

      let cardRowId: string | null = null;

      try {
        const { data: cardRow, error: cardInsertError } =
          await supabaseAdmin
            .from("cards")
            .insert({
              card_id: cardId,
              giver_name: "Store card",
              amount: 0,
              note: null,
              claimed: false,
              funded: false,
              printed: false,
              print_file_url: null,
            })
            .select("id")
            .single();

        if (cardInsertError || !cardRow) {
          console.error(
            "[stripewebhook] Error inserting card row",
            cardInsertError,
          );
          continue;
        }

        cardRowId = cardRow.id;
      } catch (cardErr) {
        console.error(
          "[stripewebhook] Unexpected error inserting card row",
          cardErr,
        );
        continue;
      }

      if (!cardRowId) continue;

      let uploadFailed = false;
      let publicUrl: string | null = null;

      try {
        const pngBuffer = await generateGiftlinkInsidePng(cardId);

        const filePath = `cards/${cardId}.png`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from("printfiles")
          .upload(filePath, pngBuffer, {
            contentType: "image/png",
            upsert: true,
          });

        if (uploadError) {
          console.error(
            "[stripewebhook] Error uploading PNG to Supabase",
            uploadError,
          );
          uploadFailed = true;
        } else {
          const {
            data: { publicUrl: url },
          } = supabaseAdmin.storage
            .from("printfiles")
            .getPublicUrl(filePath);

          publicUrl = url;

          const { error: updateCardError } = await supabaseAdmin
            .from("cards")
            .update({
              print_file_url: publicUrl,
            })
            .eq("card_id", cardId);

          if (updateCardError) {
            console.error(
              "[stripewebhook] Error updating card print_file_url",
              updateCardError,
            );
          } else {
            console.log(
              "[stripewebhook] Updated card print_file_url for card",
              cardId,
            );
          }
        }
      } catch (pngErr) {
        console.error(
          "[stripewebhook] Error generating or uploading PNG",
          pngErr,
        );
        uploadFailed = true;
      }

      try {
        const { error: printJobError } = await supabaseAdmin
          .from("card_print_jobs")
          .insert({
            card_id: cardId,
            order_id: orderId,
            pdf_path: publicUrl ? `cards/${cardId}.png` : null,
            status: uploadFailed ? "error" : "generated",
            error_message: uploadFailed
              ? "PNG generation or upload failed"
              : null,
          });

        if (printJobError) {
          console.error(
            "[stripewebhook] Error inserting card_print_jobs row",
            printJobError,
          );
        } else {
          console.log(
            "[stripewebhook] Created card_print_jobs row for card",
            cardId,
          );
        }
      } catch (jobErr) {
        console.error(
          "[stripewebhook] Unexpected error inserting card_print_jobs row",
          jobErr,
        );
      }
    }
  }

  console.log(
    "[stripewebhook] Total cards to create for session",
    stripeSessionId,
    "=>",
    totalCardsToCreate,
  );

  // 4) Create one Printful order for all cards
  if (hasValidShipping && allCardIds.length > 0) {
    try {
      console.log(
        "[stripewebhook] Creating Printful order for cards",
        allCardIds,
      );

      await createPrintfulOrderForCards({
        orderId,
        cards: allCardIds.map((cardId) => ({
          cardId,
          storagePath: null,
        })),
      });

      console.log(
        "[stripewebhook] Successfully created Printful order for cards",
      );
    } catch (printfulErr) {
      console.error(
        "[stripewebhook] Error creating Printful order",
        printfulErr,
      );
    }
  } else if (!hasValidShipping) {
    console.warn(
      "[stripewebhook] Skipping Printful order creation due to missing shipping",
    );
  }
}

export async function POST(req: NextRequest) {
  if (!stripe || !stripeWebhookSecret) {
    console.error(
      "[stripewebhook] Stripe not configured or webhook secret missing",
    );
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 500 },
    );
  }

  if (!supabaseAdmin) {
    console.error("[stripewebhook] Supabase env vars missing");
    return NextResponse.json(
      { error: "Supabase env vars missing" },
      { status: 500 },
    );
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    if (!signature) {
      console.error("[stripewebhook] Missing stripe-signature header");
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 },
      );
    }

    event = stripe.webhooks.constructEvent(
      body,
      signature,
      stripeWebhookSecret,
    );
  } catch (err) {
    console.error("[stripewebhook] Error verifying Stripe webhook", err);
    return NextResponse.json(
      { error: "Invalid Stripe webhook" },
      { status: 400 },
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const mode = session.mode;
      console.log(
        "[stripewebhook] checkout.session.completed for mode",
        mode,
        "metadata.type",
        session.metadata?.type,
      );

      await handleCardPackOrder(session, stripe);
    } else {
      console.log(
        "[stripewebhook] Received unsupported event type",
        event.type,
      );
    }
  } catch (err) {
    console.error("[stripewebhook] Top level handler error", err);
  }

  return NextResponse.json({ received: true });
}
