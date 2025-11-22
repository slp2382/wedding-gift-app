// app/api/printful-test/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createPrintfulOrderForCards } from "@/lib/printful";

export const runtime = "nodejs";

// Simple test endpoint to trigger a single combined Printful order
// Body:
//
// {
//   "orderId": "uuid from orders table",
//   "cardIds": ["card_abc12345", "card_def67890"]
// }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    const orderId = body?.orderId as string | null;
    const cardIds = (body?.cardIds as string[] | null) ?? [];

    if (!orderId || !Array.isArray(cardIds) || cardIds.length === 0) {
      return NextResponse.json(
        {
          error:
            "Provide orderId and cardIds array in body example { orderId, cardIds: [cardId1, cardId2] }",
        },
        { status: 400 },
      );
    }

    const cards = cardIds.map((cardId) => ({
      cardId,
      storagePath: null as string | null,
    }));

    const { printfulOrderId, status } = await createPrintfulOrderForCards({
      orderId,
      cards,
    });

    return NextResponse.json(
      {
        ok: true,
        printfulOrderId,
        status,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[printful test] Error creating Printful order", err);
    return NextResponse.json(
      { error: "Failed to create Printful test order" },
      { status: 500 },
    );
  }
}
