// app/api/request-payout/route.ts
import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabaseClient";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      cardId,
      contactName,
      contactEmail,
      payoutMethod,
      payoutDetails,
    } = body as {
      cardId: string;
      contactName: string;
      contactEmail: string;
      payoutMethod: string;
      payoutDetails?: string | null;
    };

    if (!cardId || !contactName || !contactEmail || !payoutMethod) {
      return NextResponse.json(
        { error: "Missing required payout fields" },
        { status: 400 },
      );
    }

    const { error } = await supabase.from("payout_requests").insert({
      card_id: cardId,
      contact_name: contactName,
      contact_email: contactEmail,
      payout_method: payoutMethod,
      payout_details: payoutDetails || null,
      status: "pending",
    });

    if (error) {
      console.error("Error inserting payout request:", error);
      return NextResponse.json(
        { error: "Could not save payout request" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error in /api/request-payout:", err);
    return NextResponse.json(
      { error: "Unexpected error handling payout request" },
      { status: 500 },
    );
  }
}
