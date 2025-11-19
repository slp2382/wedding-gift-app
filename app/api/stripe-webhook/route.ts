// app/api/stripe-webhook/route.ts

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import QRCode from "qrcode";
import { createCanvas, loadImage } from "canvas";
import { createPrintfulOrderForCard } from "@/lib/printful";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const giftlinkBaseUrl =
  process.env.GIFTLINK_BASE_URL ?? "https://www.giftlink.cards";

// Do NOT throw at module load time.
// Create clients lazily / guarded so build does not break.

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

const supabaseAdmin: any =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { persistSession: false },
      })
    : null;

async function generateGiftlinkInsidePng(cardId: string): Promise<Buffer> {
  const width = 1245; // 4.15 in at 300 dpi
  const height = 1845; // 6.15 in at 300 dpi

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // QR code data
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
        margin: 1,
        width: qrSize,
        errorCorrectionLevel: "H",
      },
      (err) => {
        if (err) return reject(err);
        resolve();
      },
    );
  });

  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  // Optional logo under the code
  const logoPath = "public/print-templates/giftlink-logo.png";

  try {
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
    // If logo is missing just leave the card blank under the code
  }

  return canvas.toBuffer("image/png");
}

export async function POST(req: NextRequest) {
  // Runtime env checks happen here, NOT at module load.
  if (!stripe || !stripeWebhookSecret) {
    console.error("[stripewebhook] Stripe env vars missing");
    return NextResponse.json(
      { error: "Stripe env vars missing" },
      { status: 500 },
    );
  }

  if (!supabaseAdmin) {
    console.error("[stripewebhook] Supabase server env vars missing");
    return NextResponse.json(
      { error: "Supabase server env vars missing" },
      { status: 500 },
    );
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    if (!signature) {
      console.error("[stripewebhook] Missing stripe-signature header");
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    event = stripe.webhooks.constructEvent(
      body,
      signature as string,
      stripeWebhookSecret as string,
    );
  } catch (err) {
    console.error("[stripewebhook] Error verifying Stripe signature", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    // Treat the payload as a checkout session shape without fighting Stripe TS unions
    const session = event.data.object as any;
    const metadata = session.metadata ?? {};
    const type = metadata.type;

    if (type === "card_pack_order") {
      console.log(
        "[stripewebhook] Handling card_pack_order checkout.session.completed",
      );

      // Build or reuse order
      const stripeSessionId = session.id;

      let orderId: string | null = null;

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
        } else {
          const shipping = session.shipping_details;
          const address = shipping?.address;
          const email =
            session.customer_details?.email ??
            session.customer_email ??
            null;

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
                items: metadata.items ? JSON.parse(metadata.items) : null,
                amount_total: session.amount_total
                  ? session.amount_total / 100
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

      // Create store card row
      const rawCardId =
        metadata.cardId ??
        `card_${randomUUID().replace(/-/g, "").slice(0, 8)}`;

      const cardId = rawCardId;

      let cardRowId: string | null = null;

      try {
        const { data: cardRow, error: cardInsertError } = await supabaseAdmin
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
        } else {
          cardRowId = cardRow.id;
        }
      } catch (cardErr) {
        console.error(
          "[stripewebhook] Unexpected error inserting card row",
          cardErr,
        );
      }

      // Generate inside right PNG
      let storagePath: string | null = null;
      let uploadFailed = false;

      try {
        console.log("[stripewebhook] Generating inside PNG for", cardId);
        const pngBuffer = await generateGiftlinkInsidePng(cardId);

        storagePath = `cards/${cardId}.png`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from("printfiles")
          .upload(storagePath, pngBuffer, {
            contentType: "image/png",
            upsert: true,
          });

        if (uploadError) {
          uploadFailed = true;
          console.error(
            "[stripewebhook] Error uploading print PNG to Supabase",
            uploadError,
          );
        } else {
          console.log(
            "[stripewebhook] Uploaded print PNG to Supabase at",
            storagePath,
          );
        }
      } catch (pngErr) {
        uploadFailed = true;
        console.error(
          "[stripewebhook] Error generating or uploading PNG",
          pngErr,
        );
      }

      // Update card row with print file url and printed flag
      if (storagePath && !uploadFailed && cardRowId) {
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/printfiles/${storagePath}`;

        const { error: cardUpdateError } = await supabaseAdmin
          .from("cards")
          .update({
            printed: true,
            print_file_url: publicUrl,
          })
          .eq("id", cardRowId);

        if (cardUpdateError) {
          console.error(
            "[stripewebhook] Error updating card with print file url",
            cardUpdateError,
          );
        }
      }

      // Insert card_print_jobs row
      let printJobId: string | null = null;

      try {
        const { data: printJob, error: printJobError } = await supabaseAdmin
          .from("card_print_jobs")
          .insert({
            card_id: cardId,
            order_id: orderId,
            pdf_path: storagePath ?? null,
            status: uploadFailed ? "error" : "generated",
            error_message: uploadFailed
              ? "PNG generation or upload failed"
              : null,
          })
          .select("id")
          .single();

        if (printJobError || !printJob) {
          console.error(
            "[stripewebhook] Error inserting card_print_jobs row",
            printJobError,
          );
        } else {
          printJobId = printJob.id;
          console.log(
            "[stripewebhook] Created card_print_jobs row",
            printJobId,
          );
        }
      } catch (jobErr) {
        console.error(
          "[stripewebhook] Unexpected error inserting card_print_jobs row",
          jobErr,
        );
      }

      // Automatic Printful order creation
      if (!uploadFailed && printJobId) {
        try {
          console.log(
            "[stripewebhook] Calling createPrintfulOrderForCard for",
            cardId,
          );
          const { printfulOrderId, status } =
            await createPrintfulOrderForCard(cardId);
          console.log(
            "[stripewebhook] Printful order created",
            printfulOrderId,
            status,
          );
          // Success path does not need extra updates here
          // createPrintfulOrderForCard already updates card_print_jobs
        } catch (printfulErr) {
          console.error(
            "[stripewebhook] Printful order failed for",
            cardId,
            printfulErr,
          );

          const message =
            printfulErr instanceof Error
              ? printfulErr.message
              : JSON.stringify(printfulErr);

          // Mark this print job as error
          try {
            const { error: updateJobError } = await supabaseAdmin
              .from("card_print_jobs")
              .update({
                status: "error",
                error_message: message,
              })
              .eq("id", printJobId);

            if (updateJobError) {
              console.error(
                "[stripewebhook] Error updating card_print_jobs after Printful failure",
                updateJobError,
              );
            }
          } catch (updateErr) {
            console.error(
              "[stripewebhook] Unexpected error updating card_print_jobs after Printful failure",
              updateErr,
            );
          }
        }
      } else {
        console.log(
          "[stripewebhook] Skipping Printful order creation because PNG upload failed or print job insert failed",
        );
      }
    } else {
      // Gift load flow
      console.log(
        "[stripewebhook] Handling gift load checkout.session.completed",
      );

      const cardId = metadata.cardId;

      if (!cardId) {
        console.error(
          "[stripewebhook] Missing cardId metadata for gift load",
        );
        return NextResponse.json({ received: true });
      }

      const amountTotal = session.amount_total ?? 0;
      const giftAmount = amountTotal / 100;

      const giverName =
        session.customer_details?.name ??
        metadata.giverName ??
        "GiftLink guest";

      const note = metadata.note ?? null;

      try {
        const { error: updateCardError } = await supabaseAdmin
          .from("cards")
          .update({
            giver_name: giverName,
            amount: giftAmount,
            note,
            funded: true,
          })
          .eq("card_id", cardId);

        if (updateCardError) {
          console.error(
            "[stripewebhook] Error updating card for gift load",
            updateCardError,
          );
        } else {
          console.log(
            "[stripewebhook] Updated card for gift load",
            cardId,
          );
        }
      } catch (giftErr) {
        console.error(
          "[stripewebhook] Unexpected error updating card for gift load",
          giftErr,
        );
      }
    }
  } else {
    // Other Stripe events can be logged if desired
    console.log(
      "[stripewebhook] Received unsupported event type",
      event.type,
    );
  }

  // Always respond 200 so Stripe does not retry forever
  return NextResponse.json({ received: true });
}
