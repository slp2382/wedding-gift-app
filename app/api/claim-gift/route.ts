import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabaseClient";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { cardId } = body;

  if (!cardId) {
    return NextResponse.json(
      { error: "cardId is required." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("cards")
    .update({ claimed: true })
    .eq("card_id", cardId)
    .select()
    .single();

  if (error) {
    console.error("Error claiming gift", error);
    return NextResponse.json(
      { error: "Failed to mark gift as claimed." },
      { status: 500 }
    );
  }

  return NextResponse.json({ card: data });
}
