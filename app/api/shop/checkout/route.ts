import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;
const stripe = new Stripe(stripeSecretKey);

const priceId = process.env.STRIPE_SHOP_CARD_PRICE_ID!;

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get("origin") ?? "";

    const { product } = (await req.json()) as {
      product?: string;
    };

    if (!product || product !== "single_card") {
      return NextResponse.json(
        { error: "Unsupported product" },
        { status: 400 },
      );
    }

    // For now quantity is fixed at 1
    const quantity = 1;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
      success_url: `${origin}/shop?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/shop?status=cancelled`,
      metadata: {
        type: "card_pack_order",
        product: "single_card",
        items: JSON.stringify([
          {
            sku: "Card1",
            product: "single_card",
            quantity,
          },
        ]),
      },
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      // Charge the customer for shipping
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              // amount in cents, adjust as needed
              amount: 499, // 4.99 USD standard shipping
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
