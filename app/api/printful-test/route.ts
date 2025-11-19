import { NextRequest, NextResponse } from "next/server";
import { createPrintfulOrderForCard } from "@/lib/printful";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const cardId = body.cardId as string | undefined;

    if (!cardId) {
      return new NextResponse("Missing cardId in body", { status: 400 });
    }

    const result = await createPrintfulOrderForCard(cardId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("printful-test error", err);
    return new NextResponse(err?.message ?? "Error", { status: 500 });
  }
}
