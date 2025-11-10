import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is missing");
}

if (!stripeWebhookSecret) {
  throw new Error("STRIPE_WEBHOOK_SECRET is missing");
}

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing");
}

// Use library default API version to avoid TypeScript type mismatch with SDK
const stripe = new Stripe(stripeSecretKey);

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
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
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata ?? {};
    const type = metadata.type;

    try {
      if (type === "card_pack_order") {
        // Card pack shop order branch

        const shipping = session.shipping_details;
        const address = shipping?.address;

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
          email: session.customer_details?.email ?? null,

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

        // Handle retry case for duplicate insert
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
            status: 500 },
          );
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
