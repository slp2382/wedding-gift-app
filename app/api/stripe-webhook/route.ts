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
    const sessionAny = session as any;

    const metadata = session.metadata ?? {};
    const type = metadata.type;

    try {
      if (type === "card_pack_order") {
        // Card pack shop order branch

        const shipping = sessionAny.shipping_details as
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

        const address = shipping?.address ?? null;

        const customerDetails = sessionAny.customer_details as
          | {
              email?: string | null;
            }
          | null
          | undefined;

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

          shipping_name: shipping?.name ?? null,
          shipping_address_line1: address?.line1 ?? null,
          shipping_address_line2: address?.line2 ?? null,
          shipping_city: address?.city ?? null,
          shipping_state: address?.state ?? null,
          shipping_postal_code: address?.postal_code ?? null,
          shipping_country: address?.country ?? null,

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
        // Gift load branch

        const cardId = metadata.cardId;
        const giverName = metadata.giverName ?? "";
        const note = metadata.note ?? "";

        // Metadata gift amount in cents from your /api/load-gift route
        const giftAmountRaw = metadata.giftAmountRaw;
        const feeAmountRaw = metadata.feeAmountRaw;
        const totalChargeRaw = metadata.totalChargeRaw;

        let giftAmountCents: number | null = null;

        if (giftAmountRaw != null) {
          giftAmountCents = Number(giftAmountRaw);
        } else if (session.amount_total != null) {
          giftAmountCents = session.amount_total;
        }

        if (!cardId || giftAmountCents == null) {
          console.error("Missing cardId or gift amount for gift load");
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
