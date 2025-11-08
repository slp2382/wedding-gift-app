// app/api/load-gift/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const POST = async (request: NextRequest) => {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    console.error("Stripe secret key is missing on the server");
    return NextResponse.json(
      { error: "Stripe secret key not configured on server" },
      { status: 500 }
    );
  }

  const stripe = new Stripe(secretKey);

  try {
    const body = await request.json();
    const { cardId, giverName, amount, note } = body as {
      cardId: string;
      giverName?: string;
      amount: number | string;
      note?: string | null;
    };

    if (!cardId || amount == null) {
      return NextResponse.json(
        { error: "Missing card id or amount" },
        { status: 400 }
      );
    }

    const amountNumber = Number(amount);
    if (!amountNumber || amountNumber <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than zero" },
        { status: 400 }
      );
    }

    // Calculate doubled fee: 2 × (2.9% + $0.30) = 5.8% + $0.60
    const fee = amountNumber * 0.058 + 0.60;
    const totalCharge = amountNumber + fee;

    // Prefer the actual host the user visited, fall back to VERCEL_URL
    const host =
      request.headers.get("host") ||
      process.env.VERCEL_URL ||
      "localhost:3000";
    const protocol = host.startsWith("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Wedding Gift",
              description: `Gift loaded to card ${cardId}`,
            },
            unit_amount: Math.round(amountNumber * 100),
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Processing & Service Fee",
            },
            unit_amount: Math.round(fee * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/card/${cardId}?status=paid&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/card/${cardId}?status=cancelled`,
      metadata: {
        cardId,
        giverName: giverName || "",
        note: note || "",
        giftAmount: amountNumber.toFixed(2),
        feeAmount: fee.toFixed(2),
        totalCharge: totalCharge.toFixed(2),
      },
    });

    return NextResponse.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error("Error creating checkout session", error);
    return NextResponse.json(
      { error: "Internal server error creating checkout session" },
      { status: 500 }
    );
  }
};
