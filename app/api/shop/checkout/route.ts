// app/api/shop/checkout/route.ts

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { CARD_TEMPLATES } from "@/lib/cardTemplates";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;

type CartItemPayload = {
  templateId: string;
  quantity: number;
};

type RecipientPayload = {
  name: string;
  address1: string;
  city: string;
  stateCode: string;
  countryCode: string;
  zip: string;
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

    if (!PRINTFUL_API_KEY) {
      console.error("[shop/checkout] Missing PRINTFUL_API_KEY");
      return NextResponse.json(
        { error: "Shipping is not configured" },
        { status: 500 },
      );
    }

    const originHeader = req.headers.get("origin");
    const origin =
      originHeader ||
      process.env.GIFTLINK_BASE_URL ||
      "https://www.giftlink.cards";

    const body = (await req.json().catch(() => null)) as
      | { items?: CartItemPayload[]; recipient?: RecipientPayload }
      | null;

    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      console.error("[shop/checkout] Missing or empty items in request body");
      return NextResponse.json(
        { error: "Your cart is empty" },
        { status: 400 },
      );
    }

    if (!body.recipient) {
      console.error("[shop/checkout] Missing recipient in request body");
      return NextResponse.json(
        { error: "Shipping address is required" },
        { status: 400 },
      );
    }

    const cartItems = body.items;
    const recipient = body.recipient;

    // Build Stripe line items from cart using pack based pricing (1, 3, 5)
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
          (template as any).id ?? template,
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
            templateId: (template as any).id ?? "",
            size: (template as any).size ?? "",
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

    // Compute Printful shipping again on the server to avoid trusting the client
    // Map cart items to Printful catalog variant ids and aggregate quantities
    const variantQuantity = new Map<number, number>();

    for (const item of cartItems) {
      const template = CARD_TEMPLATES.find(
        (t) => t.id === item.templateId,
      );

      if (!template) {
        console.error(
          "[shop/checkout] Unknown template when mapping shipping",
          item.templateId,
        );
        continue;
      }

      const shippingVariant =
        (template as any).printfulShippingVariantId ??
        (template as any).printfulCatalogVariantId;

      if (!shippingVariant) {
        console.error(
          "[shop/checkout] Missing Printful shipping variant for template",
          item.templateId,
        );
        continue;
      }

      const variantId = Number(shippingVariant);
      if (!Number.isFinite(variantId)) {
        console.error(
          "[shop/checkout] Invalid Printful shipping variant id for template",
          item.templateId,
          shippingVariant,
        );
        continue;
      }

      const prev = variantQuantity.get(variantId) ?? 0;
      variantQuantity.set(variantId, prev + Number(item.quantity ?? 0));
    }

    if (!variantQuantity.size) {
      console.error(
        "[shop/checkout] Could not map any items to Printful variants for shipping",
      );
      return NextResponse.json(
        { error: "Could not calculate shipping for this cart" },
        { status: 400 },
      );
    }

    const itemsForPrintful = Array.from(variantQuantity.entries()).map(
      ([variant_id, quantity]) => ({
        variant_id,
        quantity,
      }),
    );

    const shippingBody = {
      recipient: {
        name: recipient.name,
        address1: recipient.address1,
        city: recipient.city,
        state_code: recipient.stateCode,
        country_code: recipient.countryCode || "US",
        zip: recipient.zip,
      },
      items: itemsForPrintful,
      currency: "USD",
    };

    const shippingRes = await fetch("https://api.printful.com/shipping/rates", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PRINTFUL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(shippingBody),
    });

    if (!shippingRes.ok) {
      const text = await shippingRes.text().catch(() => "");
      console.error(
        "[shop/checkout] Printful shipping error",
        shippingRes.status,
        text,
      );
      return NextResponse.json(
        { error: "Failed to calculate shipping" },
        { status: 500 },
      );
    }

    const shippingJson = (await shippingRes.json()) as {
      code: number;
      result: Array<{
        id: string;
        name: string;
        rate: string;
        currency: string;
      }>;
    };

    if (!shippingJson.result || shippingJson.result.length === 0) {
      console.error("[shop/checkout] No shipping methods returned from Printful");
      return NextResponse.json(
        { error: "No shipping methods available" },
        { status: 400 },
      );
    }

    // For now, select the first method (typically STANDARD / Flat Rate)
    const best = shippingJson.result[0];
    const printfulRate = parseFloat(best.rate);
    if (!Number.isFinite(printfulRate)) {
      console.error(
        "[shop/checkout] Invalid Printful rate value",
        best.rate,
      );
      return NextResponse.json(
        { error: "Invalid shipping rate received" },
        { status: 500 },
      );
    }

    const printfulRateCents = Math.round(printfulRate * 100);
    const handlingCents = 50;
    const totalShippingCents = printfulRateCents + handlingCents;

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
        packQuantity: String(totalCards),
        // Additional shipping metadata for webhook and admin use
        shipping_printful_method_id: best.id,
        shipping_printful_method_name: best.name,
        shipping_printful_rate_cents: String(printfulRateCents),
        shipping_handling_cents: String(handlingCents),
        shipping_total_cents: String(totalShippingCents),
        shipping_country: recipient.countryCode,
        shipping_state: recipient.stateCode,
        shipping_zip: recipient.zip,
      },
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            display_name: "Shipping and handling",
            type: "fixed_amount",
            fixed_amount: {
              amount: totalShippingCents,
              currency: "usd",
            },
          },
        },
      ],
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
