// app/api/stripe-webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createPrintfulOrderForCards } from "@/lib/printful";

// Stripe env
const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Supabase env
const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Stripe client (use default apiVersion for your account)
const stripe = new Stripe(stripeSecretKey);

// Supabase admin client
const supabaseAdmin: SupabaseClient | null =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      })
    : null;

// ------------------------------
// PNG generator: white background plus QR near bottom center
// ------------------------------
async function generateGiftlinkInsidePng(cardId: string) {
  const { createCanvas } = await import("canvas");
  const QRCode = (await import("qrcode")).default;

  // 4.15" x 6.15" at 300 DPI
  const WIDTH = 1245;
  const HEIGHT = 1845;

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Card URL for QR
  const cardUrl = `https://www.giftlink.cards/card/${cardId}`;

  // QR as PNG buffer
  const qrBuffer = await QRCode.toBuffer(cardUrl, {
    width: 300,
    margin: 0,
  });

  const qrImage = await (await import("canvas")).loadImage(qrBuffer);

  // Position QR near bottom center
  const QR_SIZE = 300;
  const bottomMargin = 200;
  const centerX = WIDTH / 2;
  const startY = HEIGHT - bottomMargin - QR_SIZE;

  ctx.drawImage(
    qrImage,
    centerX - QR_SIZE / 2,
    startY,
    QR_SIZE,
    QR_SIZE,
  );

  return canvas.toBuffer("image/png");
}

export async function POST(req: NextRequest) {
  if (!stripeSecretKey || !stripeWebhookSecret) {
    console.error("Stripe env vars are missing");
    return new NextResponse("Stripe not configured", { status: 500 });
  }

  if (!supabaseAdmin || !supabaseUrl) {
    console.error(
      "Supabase admin client not configured, missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
    return new NextResponse("Supabase not configured", { status: 500 });
  }

  console.log("Supabase URL in stripe webhook route", supabaseUrl);

  let event: Stripe.Event;

  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  if (!signature) {
    return new NextResponse("Missing Stripe signature header", {
      status: 400,
    });
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
    const metadata = (session.metadata ?? {}) as Record<
      string,
      string | undefined
    >;
    const type = metadata.type;

    try {
      // 1) SHOP CARD PACK ORDERS
      if (type === "card_pack_order") {
        console.log("Handling card_pack_order for session", session.id);

        const customerDetails = session.customer_details as
          | {
              email?: string | null;
              name?: string | null;
              address?: {
                line1?: string | null;
                line2?: string | null;
                city?: string | null;
                state?: string | null;
                postal_code?: string | null;
                country?: string | null;
              } | null;
            }
          | null
          | undefined;

        let shippingName: string | null = customerDetails?.name ?? null;
        let addressLine1: string | null =
          customerDetails?.address?.line1 ?? null;
        let addressLine2: string | null =
          customerDetails?.address?.line2 ?? null;
        let addressCity: string | null =
          customerDetails?.address?.city ?? null;
        let addressState: string | null =
          customerDetails?.address?.state ?? null;
        let addressPostalCode: string | null =
          customerDetails?.address?.postal_code ?? null;
        let addressCountry: string | null =
          customerDetails?.address?.country ?? null;

        // Prefer shipping details from PaymentIntent if available
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
              | {
                  name?: string | null;
                  address?: {
                    line1?: string | null;
                    line2?: string | null;
                    city?: string | null;
                    state?: string | null;
                    postal_code?: string | null;
                    country?: string | null;
                  } | null;
                }
              | null
              | undefined;

            if (piShipping) {
              shippingName = piShipping.name ?? shippingName;
              addressLine1 =
                piShipping.address?.line1 ?? addressLine1 ?? null;
              addressLine2 =
                piShipping.address?.line2 ?? addressLine2 ?? null;
              addressCity =
                piShipping.address?.city ?? addressCity ?? null;
              addressState =
                piShipping.address?.state ?? addressState ?? null;
              addressPostalCode =
                piShipping.address?.postal_code ??
                addressPostalCode ??
                null;
              addressCountry =
                piShipping.address?.country ?? addressCountry ?? null;
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
            ? [
                {
                  product: metadata.product,
                  quantity: 1,
                },
              ]
            : null;

        // Create or reuse order row
        let orderId: string | null = null;

        const { data: insertedOrder, error: orderInsertError } =
          await supabaseAdmin
            .from("orders")
            .insert({
              stripe_session_id: session.id,
              email: customerDetails?.email ?? null,

              shipping_name: shippingName,
              shipping_address_line1: addressLine1,
              shipping_address_line2: addressLine2,
              shipping_city: addressCity,
              shipping_state: addressState,
              shipping_postal_code: addressPostalCode,
              shipping_country: addressCountry,

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
            const { data: existingOrder, error: existingOrderError } =
              await supabaseAdmin
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
            return new NextResponse("Supabase insert error", {
              status: 500,
            });
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

        // Determine pack quantity from metadata
        const rawPackQuantity =
          metadata.packQuantity ??
          metadata.pack_quantity ??
          metadata.quantity ??
          null;

        let packQuantity = 1;
        if (rawPackQuantity != null) {
          const parsed = Number(rawPackQuantity);
          if (!Number.isNaN(parsed) && parsed > 0) {
            packQuantity = parsed;
          }
        }

        console.log(
          "Card pack order quantity (number of cards to create):",
          packQuantity,
        );

        // Sanity check bucket
        console.log(
          "Testing list on storage bucket 'printfiles' under prefix 'cards'",
        );
        const { data: listData, error: listError } =
          await supabaseAdmin.storage
            .from("printfiles")
            .list("cards", { limit: 1 });

        console.log("Bucket list result", {
          listError,
          listCount: listData?.length ?? 0,
        });

        // Build up cards for Printful
        const cardsForPrintful: { cardId: string; storagePath: string }[] = [];

        // Create one card per pack unit
        for (let i = 0; i < packQuantity; i++) {
          // Card id for physical card
          const cardId =
            (packQuantity === 1
              ? metadata.cardId ?? metadata.card_id
              : undefined) ??
            `card_${Math.random().toString(36).slice(2, 10)}`;

          console.log("Using card id for shop order", cardId);

          // Create card row
          const { error: cardInsertError } = await supabaseAdmin
            .from("cards")
            .insert({
              card_id: cardId,
              giver_name: "Store card",
              amount: 0,
              note: null,
              claimed: false,
            });

          if (cardInsertError) {
            if (cardInsertError.code === "23505") {
              console.log(
                "Card already exists for shop order, reusing",
                cardId,
              );
            } else {
              console.error(
                "Error inserting card for shop order",
                cardInsertError,
              );
              // Skip this card and continue with others
              continue;
            }
          }

          try {
            // Generate and upload PNG for this card
            const pngBytes = await generateGiftlinkInsidePng(cardId);
            const pngPath = `cards/${cardId}.png`;

            console.log("Uploading print PNG to Supabase at", pngPath);

            const { error: uploadError } = await supabaseAdmin.storage
              .from("printfiles")
              .upload(pngPath, pngBytes, {
                contentType: "image/png",
                upsert: true,
              });

            if (uploadError) {
              console.error(
                "Error uploading print PNG to Supabase Storage",
                uploadError,
              );
            } else {
              console.log(
                "Generated and stored print PNG for shop card",
                cardId,
              );
            }

            // Public URL for cards table
            const { data: publicUrlData } = supabaseAdmin.storage
              .from("printfiles")
              .getPublicUrl(pngPath);
            const publicUrl = publicUrlData?.publicUrl ?? null;

            const { error: cardUpdateError } = await supabaseAdmin
              .from("cards")
              .update({
                printed: uploadError ? false : true,
                print_file_url: publicUrl,
              })
              .eq("card_id", cardId);

            if (cardUpdateError) {
              console.error(
                "Error updating card with print file url",
                cardUpdateError,
              );
            }

            // Insert card_print_jobs row
            const { error: jobError } = await supabaseAdmin
              .from("card_print_jobs")
              .insert({
                card_id: cardId,
                order_id: orderId,
                pdf_path: pngPath, // storing PNG path in this column
                status: uploadError ? "error" : "generated",
                error_message: uploadError
                  ? uploadError.message
                  : null,
                fulfillment_status: "pending",
              });

            if (jobError) {
              console.error(
                "Error inserting card_print_job row",
                jobError,
              );
            } else if (!uploadError) {
              // Only include successfully uploaded cards in Printful payload
              cardsForPrintful.push({
                cardId,
                storagePath: pngPath,
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

        // Call Printful automatically if at least one card was successfully uploaded
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
            console.error(
              "Failed to create Printful order from webhook",
              err,
            );
            // Optional: you could also mark all related card_print_jobs as error here
          }
        } else {
          console.error(
            "No cards were successfully uploaded to storage; skipping Printful order creation",
          );
        }

        // 2) GIFT LOADS (existing virtual card flow)
      } else {
        const cardId = metadata.cardId ?? metadata.card_id;
        const giverName = metadata.giverName ?? metadata.giver_name ?? "";
        const note = metadata.note ?? "";

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
          if (!Number.isNaN(parsed) && parsed > 0) {
            giftAmount = parsed;
          }
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
          return new NextResponse("Missing metadata", {
            status: 400,
          });
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
          return new NextResponse("Supabase update error", {
            status: 500,
          });
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
