import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "../../../lib/supabaseClient";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST(request: Request) {
  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: "Stripe is not configured on the server." },
      { status: 500 }
    );
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2024-06-20" as any,
  });

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { cardId, amount, giverName, note } = body;

  if (!cardId || !amount || !giverName) {
    return NextResponse.json(
      { error: "cardId, amount, and giverName are required." },
      { status: 400 }
    );
  }

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return NextResponse.json(
      { error: "Amount must be a positive number." },
      { status: 400 }
    );
  }

  const successUrl = `${appUrl}/card/${cardId}?status=paid&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${appUrl}/card/${cardId}?status=cancelled`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "GiftLink Wedding Gift",
            description: `Gift loaded to card ${cardId}`,
          },
          unit_amount: Math.round(numericAmount * 100),
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      cardId,
      giverName,
      note: note || "",
    },
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Failed to create Stripe checkout session." },
      { status: 500 }
    );
  }

  return NextResponse.json({ checkoutUrl: session.url });
}
