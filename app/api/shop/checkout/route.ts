// app/api/shop/checkout/route.ts

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { CARD_TEMPLATES } from "@/lib/cardTemplates";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

// Optional: flat shipping price id (3.99) as a separate Stripe Price
const shippingPriceId = process.env.STRIPE_SHOP_SHIPPING_PRICE_ID || null;

type CartItemPayload = {
  templateId: string;
  quantity: number;
};

export async function POST(req: NextRequest) {
  try {
    if (!stripe) {
      console.error("[shop/checkout] Missing STRIPE_SECRET_KEY");
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 500 },
      );
    }

    const originHeader = req.headers.get("origin");
    const origin =
      originHeader ||
      process.env.GIFTLINK_BASE_URL ||
      "https://www.giftlink.cards";

    const body = (await req.json().catch(() => null)) as
      | { items?: CartItemPayload[] }
      | null;

    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "No items in request" },
        { status: 400 },
      );
    }

    const cartItems = body.items;

    // Build Stripe line items from cart
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const metadataItems: Array<{
      templateId: string;
      size: string;
      quantity: number;
    }> = [];

    for (const item of cartItems) {
      if (!item.templateId || !item.quantity || item.quantity <= 0) {
        continue;
      }

      const template = CARD_TEMPLATES.find(
        (t) => t.id === item.templateId,
      );

      if (!template) {
        console.error(
          "[shop/checkout] Unknown templateId in cart",
          item.templateId,
        );
        return NextResponse.json(
          { error: "Unknown product in cart" },
          { status: 400 },
        );
      }

      // We only support quantities 1, 3, or 5 for now
      if (![1, 3, 5].includes(item.quantity)) {
        console.error(
          "[shop/checkout] Unsupported quantity in cart",
          item.quantity,
        );
        return NextResponse.json(
          { error: "Unsupported quantity in cart" },
          { status: 400 },
        );
      }

      const priceId = template.stripePrices[item.quantity as 1 | 3 | 5];

      if (!priceId) {
        console.error(
          "[shop/checkout] Missing Stripe price for",
          template.id,
          "qty",
          item.quantity,
        );
        return NextResponse.json(
          { error: "Pricing not configured for this option" },
          { status: 500 },
        );
      }

      // Each cart item corresponds to a single "pack" price that already
      // encodes the total for 1, 3, or 5 cards, so Stripe quantity is always 1.
      lineItems.push({
        price: priceId,
        quantity: 1,
      });

      metadataItems.push({
        templateId: template.id,
        size: template.size,
        quantity: item.quantity,
      });
    }

    if (lineItems.length === 0) {
      return NextResponse.json(
        { error: "No valid items in cart" },
        { status: 400 },
      );
    }

    // Optional: add flat shipping and handling as its own price
    if (shippingPriceId) {
      lineItems.push({
        price: shippingPriceId,
        quantity: 1,
      });
    } else {
      console.warn(
        "[shop/checkout] STRIPE_SHOP_SHIPPING_PRICE_ID not set, shipping will not be charged in Stripe",
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${origin}/shop?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/shop?status=cancelled`,
      metadata: {
        type: "card_pack_order",
        items: JSON.stringify(metadataItems),
      },
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err) {
    console.error("Error creating shop checkout session", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
