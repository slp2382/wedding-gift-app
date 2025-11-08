// pages/api/load-gift.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

type LoadGiftRequestBody = {
  cardId: string;
  giverName?: string;
  amount: number;
  note?: string | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    console.error("Stripe secret key is missing on the server");
    return res
      .status(500)
      .json({ error: "Stripe secret key not configured on server" });
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: "2024-06-20",
  });

  try {
    const { cardId, giverName, amount, note } =
      req.body as LoadGiftRequestBody;

    if (!cardId || !amount) {
      return res
        .status(400)
        .json({ error: "Missing card id or amount" });
    }

    const amountNumber = Number(amount);
    if (!amountNumber || amountNumber <= 0) {
      return res
        .status(400)
        .json({ error: "Amount must be greater than zero" });
    }

    // Build base url that works in both local dev and Vercel production
    const host =
      process.env.VERCEL_URL ||
      req.headers.host ||
      "localhost:3000";

    const protocol = host.startsWith("localhost")
      ? "http"
      : "https";

    const baseUrl = `${protocol}://${host}`;

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
            unit_amount: Math.round(amountNumber * 100),
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
      },
    });

    return res.status(200).json({
      id: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("Error creating checkout session", error);
    return res
      .status(500)
      .json({ error: "Internal server error creating checkout session" });
  }
}
