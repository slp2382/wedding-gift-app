import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const cardPriceId = process.env.STRIPE_SHOP_CARD_PRICE_ID;

export async function POST(request: Request) {
  if (!stripeSecretKey || !cardPriceId) {
    console.error(
      "Missing STRIPE_SECRET_KEY or STRIPE_SHOP_CARD_PRICE_ID for shop checkout.",
    );
    return NextResponse.json(
      { error: "Stripe not configured for shop checkout" },
      { status: 500 },
    );
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2024-06-20" as any,
  });

  let body: { product?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  // Very simple product validation for now
  if (body.product !== "single_card") {
    return NextResponse.json({ error: "Invalid product selection" }, { status: 400 });
  }

  const url = new URL(request.url);
  const origin = url.origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: cardPriceId,
          quantity: 1, // later: let user choose quantity
        },
      ],
      // For now we just send people back to /shop with a status flag
      success_url: `${origin}/shop?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/shop?status=cancelled`,
      metadata: {
        type: "card_pack_order",
        product: "single_card",
      },
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating shop checkout session:", error);
    return NextResponse.json(
      { error: "Could not start shop checkout" },
      { status: 500 },
    );
  }
}
