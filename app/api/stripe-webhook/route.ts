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

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2024-06-20" as any,
  });

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
    return new Response(
      `Webhook Error: ${(err as Error).message}`,
      { status: 400 }
    );
  }

  console.log("🔔 Stripe webhook event received:", event.type);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    console.log("✅ checkout.session.completed for session", session.id);

    const cardId = session.metadata?.cardId;
    const giverName = session.metadata?.giverName || null;
    const note = session.metadata?.note || null;
    const amountTotal = session.amount_total ?? 0;
    const amount = amountTotal / 100;

    console.log("Updating card from webhook:", {
      cardId,
      giverName,
      amount,
      note,
    });

    if (cardId) {
      const { error } = await supabase
        .from("cards")
        .update({
          giver_name: giverName,
          amount,
          note,
          // later: funded: true
        })
        .eq("card_id", cardId);

      if (error) {
        console.error("Error updating card after payment", error);
      }
    }
  }

  return NextResponse.json({ received: true });
}
