// app/api/shop/checkout/route.ts

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { CARD_TEMPLATES } from "@/lib/cardTemplates";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

// Optional flat shipping price id (for example 3.99) as a separate Stripe Price
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
        { error: "Stripe is not configured" },
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

      const rawQuantity = Number(item.quantity);
      if (!Number.isFinite(rawQuantity) || rawQuantity <= 0) {
        console.error(
          "[shop/checkout] Invalid quantity in cart",
          item.quantity,
        );
        return NextResponse.json(
          { error: "Invalid quantity in cart" },
          { status: 400 },
        );
      }

      const stripePrices = (template as any).stripePrices as
        | Record<number, string>
        | undefined;

      if (!stripePrices) {
        console.error(
          "[shop/checkout] Missing stripePrices for template",
          template.id,
        );
        return NextResponse.json(
          { error: "Pricing not configured for this product" },
          { status: 500 },
        );
      }

      // Decompose the quantity into packs of 5, 3, and 1
      let remaining = rawQuantity;
      const packSizes = [5, 3, 1];

      for (const packSize of packSizes) {
        const priceId = stripePrices[packSize];
        if (!priceId) {
          // If a pack size is not configured for this template, skip it
          continue;
        }

        while (remaining >= packSize) {
          // Each pack has its own Stripe line item
          lineItems.push({
            price: priceId,
            quantity: 1,
          });

          metadataItems.push({
            templateId: template.id,
            size: template.size,
            quantity: packSize,
          });

          remaining -= packSize;
        }
      }

      if (remaining > 0) {
        // This should not happen if 1, 3, and 5 packs are configured
        console.error(
          "[shop/checkout] Could not decompose quantity into supported packs",
          rawQuantity,
          "remaining",
          remaining,
        );
        return NextResponse.json(
          { error: "Unsupported quantity in cart" },
          { status: 400 },
        );
      }
    }

    if (lineItems.length === 0) {
      console.error("[shop/checkout] No valid line items after processing cart");
      return NextResponse.json(
        { error: "No valid items in cart" },
        { status: 400 },
      );
    }

    // Optional flat shipping and handling line item
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

    // Total number of physical cards in this order
    const totalCards = metadataItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${origin}/shop?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/shop?status=cancelled`,
      metadata: {
        type: "card_pack_order",
        items: JSON.stringify(metadataItems),
        packQuantity: String(totalCards), // this is what the webhook reads
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
