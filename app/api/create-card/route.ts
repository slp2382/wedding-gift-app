import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabaseClient";

// Helper to generate a card id
function generateCardId() {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `card_${randomPart}`;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  // Optional: accept giverName, amount, note from the client
  const giverName = body?.giverName ?? null;
  const amount = body?.amount ?? null;
  const note = body?.note ?? null;

  const cardId = generateCardId();

  let numericAmount: number | null = null;
  if (amount !== null && amount !== undefined) {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number if provided." },
        { status: 400 }
      );
    }
    numericAmount = n;
  }

  const { data, error } = await supabase
    .from("cards")
    .insert([
      {
        card_id: cardId,
        giver_name: giverName,
        amount: numericAmount,
        note,
        claimed: false,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating card", error);
    return NextResponse.json(
      { error: "Failed to create card." },
      { status: 500 }
    );
  }

  return NextResponse.json({ cardId, card: data });
}
