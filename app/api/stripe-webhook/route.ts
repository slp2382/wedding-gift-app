import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Prefer SUPABASE_URL, fall back to NEXT_PUBLIC_SUPABASE_URL
const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use default API version from the Stripe SDK
const stripe = new Stripe(stripeSecretKey);

// Create Supabase admin client only when env vars exist
const supabaseAdmin: SupabaseClient | null =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

export async function POST(req: NextRequest) {
  if (!stripeSecretKey || !stripeWebhookSecret) {
    console.error("Stripe env vars are missing");
    return new NextResponse("Stripe not configured", { status: 500 });
  }

  let event: Stripe.Event;

  const signature = req.headers.get("stripe-signature");
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
    if (!supabaseAdmin) {
      console.error(
        "Supabase admin client not configured, missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
      );
      return new NextResponse("Supabase not configured", { status: 500 });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = (session.metadata ?? {}) as Record<
      string,
      string | undefined
    >;
    const type = metadata.type;

    try {
      if (type === "card_pack_order") {
        // -------------------------------
        // Card pack shop order branch
        // -------------------------------
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

        // Start with whatever is on customer_details
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

        // Then, if there is a PaymentIntent, pull its shipping details
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

        const { error } = await supabaseAdmin.from("orders").insert({
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
        });

        // Ignore duplicate insert error
        if (error && error.code !== "23505") {
          console.error("Error inserting order", error);
          return new NextResponse("Supabase insert error", {
            status: 500,
          });
        }
      } else {
        // -------------------------------
        // Gift load branch
        // -------------------------------
        const cardId = metadata.cardId ?? metadata.card_id;
        const giverName = metadata.giverName ?? metadata.giver_name ?? "";
        const note = metadata.note ?? "";

        // Metadata values from /api/load-gift (all expected in cents)
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

        let giftAmountCents: number | null = null;

        // 1) Prefer explicit gift amount from metadata (gift-only, in cents)
        if (giftAmountRaw != null) {
          const parsed = Number(giftAmountRaw);
          if (!Number.isNaN(parsed) && parsed > 0) {
            giftAmountCents = parsed;
          }
        }

        // 2) Else compute gift = total - fee (still in cents)
        if (giftAmountCents == null && totalChargeRaw != null && feeAmountRaw != null) {
          const totalParsed = Number(totalChargeRaw);
          const feeParsed = Number(feeAmountRaw);

          if (
            !Number.isNaN(totalParsed) &&
            !Number.isNaN(feeParsed) &&
            totalParsed > feeParsed
          ) {
            giftAmountCents = totalParsed - feeParsed;
          }
        }

        // 3) Else fall back to Stripe's amount_total (gift + fee)
        //    This is a last resort; ideally metadata is always present.
        if (giftAmountCents == null && session.amount_total != null) {
          giftAmountCents = session.amount_total;
        }

        if (!cardId || giftAmountCents == null) {
          console.error(
            "Missing cardId or gift amount for gift load",
            { cardId, giftAmountRaw, totalChargeRaw, feeAmountRaw },
          );
          return new NextResponse("Missing metadata", { status: 400 });
        }

        const giftAmount = giftAmountCents / 100;

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
          giftAmountCents,
          feeAmountRaw,
          totalChargeRaw,
        });
      }
    } catch (err) {
      console.error("Error handling checkout.session.completed", err);
      return new NextResponse("Handler error", { status: 500 });
    }
  }

  return new NextResponse("ok", { status: 200 });
}
