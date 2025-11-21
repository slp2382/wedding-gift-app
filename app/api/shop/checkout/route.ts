import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  CARD_TEMPLATES,
  getCardTemplateById,
} from "@/lib/cardTemplates";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;
const stripe = new Stripe(stripeSecretKey);

type CartItemPayload = {
  templateId: string;
  quantity: number;
};

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get("origin") ?? "";

    const { items } = (await req.json()) as {
      items?: CartItemPayload[];
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Cart is empty" },
        { status: 400 },
      );
    }

    // Validate cart items and build Stripe line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const metadataItems: any[] = [];

    for (const item of items) {
      if (!item.templateId || !item.quantity || item.quantity <= 0) {
        continue;
      }

      const template = getCardTemplateById(item.templateId);
      if (!template || !template.stripePriceId) {
        console.error(
          "Unknown or misconfigured card template in cart",
          item.templateId,
        );
        continue;
      }

      lineItems.push({
        price: template.stripePriceId,
        quantity: item.quantity,
      });

      metadataItems.push({
        sku: template.sku,
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
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: 399,
              currency: "usd",
            },
            display_name: "Standard shipping",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 3 },
              maximum: { unit: "business_day", value: 5 },
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
