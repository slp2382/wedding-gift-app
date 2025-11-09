import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "../../../lib/supabaseClient";

export const runtime = "nodejs";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
  if (!stripeSecretKey || !webhookSecret) {
    console.error("Stripe webhook not configured.");
    return new Response("Stripe not configured", { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey);

  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return new Response("Missing Stripe signature", { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed.", err);
    return new Response(`Webhook Error: ${(err as Error).message}`, {
      status: 400,
    });
  }

  console.log("🔔 Stripe webhook event received:", event.type);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    console.log("✅ checkout.session.completed for session", session.id);

    const flowType = session.metadata?.type;

    // 🛒 1) Handle card pack / shop orders
    if (flowType === "card_pack_order") {
      console.log("🧾 Received card pack order via Stripe checkout:", {
        sessionId: session.id,
        email: session.customer_details?.email,
        amount_total: session.amount_total,
        product: session.metadata?.product,
      });

      // TODO (later):
      // - Insert a row into an `orders` table in Supabase with:
      //   - stripe_session_id
      //   - email / customer details
      //   - items / product metadata
      //   - amount_total
      //   - status = 'paid'
      // For now we just log and return so it doesn't touch `cards`.
      return NextResponse.json({ received: true });
    }

    // 🎁 2) Default: treat as a gift load (current behavior)
    const cardId = session.metadata?.cardId;
    const giverName = session.metadata?.giverName || null;
    const note = session.metadata?.note || null;

    // What Stripe actually charged in total (gift + fee)
    const amountTotal = session.amount_total ?? null;

    // Our metadata from /api/load-gift
    const giftAmountRaw = session.metadata?.giftAmount;
    const feeAmountRaw = session.metadata?.feeAmount;
    const totalChargeRaw = session.metadata?.totalCharge;

    // Decide what to store in Supabase as the card amount:
    // Prefer the original gift amount from metadata so the couple
    // only sees the gift, not the fee.
    let amount: number | null = null;

    if (giftAmountRaw != null) {
      const parsed = parseFloat(giftAmountRaw);
      if (!Number.isNaN(parsed)) {
        amount = parsed;
      }
    }

    // Fallback to amount_total (should rarely be used, but keeps things robust)
    if (amount == null && typeof amountTotal === "number") {
      amount = amountTotal / 100;
    }

    console.log("Updating card from webhook (gift load):", {
      cardId,
      giverName,
      note,
      giftAmountRaw,
      feeAmountRaw,
      totalChargeRaw,
      amountUsed: amount,
    });

    if (cardId && amount != null) {
      const { error } = await supabase
        .from("cards")
        .update({
          giver_name: giverName,
          amount, // <-- gift only, fee is yours
          note,
        })
        .eq("card_id", cardId);

      if (error) {
        console.error("Error updating card after payment", error);
      }
    } else {
      console.warn("Skipping card update, missing cardId or amount", {
        cardId,
        amount,
      });
    }
  }

  return NextResponse.json({ received: true });
}
