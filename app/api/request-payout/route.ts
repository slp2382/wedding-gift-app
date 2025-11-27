// app/api/request-payout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../lib/supabaseServer";
import { sendPayoutRequestAlert } from "../../../lib/smsNotifications";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await req.json();

    const {
      cardId,
      contactName,
      contactEmail,
      payoutMethod,
      payoutDetails,
    } = body || {};

    if (!cardId) {
      return NextResponse.json(
        { error: "cardId is required" },
        { status: 400 },
      );
    }

    if (!contactName) {
      return NextResponse.json(
        { error: "contactName is required" },
        { status: 400 },
      );
    }

    if (!contactEmail) {
      return NextResponse.json(
        { error: "contactEmail is required" },
        { status: 400 },
      );
    }

    if (!payoutMethod) {
      return NextResponse.json(
        { error: "payoutMethod is required" },
        { status: 400 },
      );
    }

    // 1) Look up the card to get amount and internal id
    const { data: card, error: cardError } = await supabase
      .from("cards")
      .select("id, card_id, amount, claimed")
      .eq("card_id", cardId)
      .single();

    if (cardError || !card) {
      console.error("request-payout: card lookup error", cardError);
      return NextResponse.json(
        { error: "Card not found" },
        { status: 404 },
      );
    }

    if (card.claimed) {
      return NextResponse.json(
        { error: "This card has already been claimed." },
        { status: 400 },
      );
    }

    const amountNumber = card.amount != null ? Number(card.amount) : 0;
    const amountCents =
      Number.isFinite(amountNumber) && amountNumber > 0
        ? Math.round(amountNumber * 100)
        : 0;

    if (amountCents <= 0) {
      return NextResponse.json(
        { error: "Card does not have a valid funded amount." },
        { status: 400 },
      );
    }

    // 2) Create payout_requests row
    const { data: inserted, error: insertError } = await supabase
      .from("payout_requests")
      .insert({
        card_id: card.card_id, // stored card_id value
        contact_name: contactName,
        contact_email: contactEmail,
        payout_method: payoutMethod,
        payout_details: payoutDetails || null,
        status:
          payoutMethod === "venmo"
            ? "pending"
            : "not_onboarded",
        payout_amount_cents: amountCents,
        payout_currency: "usd",
        stripe_connect_status:
          payoutMethod === "stripe_connect"
            ? "not_onboarded"
            : "not_onboarded",
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("request-payout: insert error", insertError);
      return NextResponse.json(
        { error: "Failed to create payout request." },
        { status: 500 },
      );
    }

    const payoutRequestId = inserted.id as string;

    // 3) Link card to payout request (cards.payout_request_id)
    const { error: updateCardError } = await supabase
      .from("cards")
      .update({
        payout_request_id: payoutRequestId,
      })
      .eq("id", card.id);

    if (updateCardError) {
      console.warn(
        "request-payout: failed to link card to payout_request",
        updateCardError,
      );
      // not fatal for the flow
    }

    // 4) Send SMS alert for Venmo payout requests
    if (payoutMethod === "venmo") {
      try {
        await sendPayoutRequestAlert({
          cardId: card.card_id,
          payoutMethod,
          contactName,
          contactEmail,
          payoutAmountCents: amountCents,
        });
      } catch (alertError) {
        console.error(
          "request-payout: failed to send payout SMS alert",
          alertError,
        );
        // do not fail the request if SMS fails
      }
    }

    return NextResponse.json({
      ok: true,
      payoutRequestId,
    });
  } catch (err: any) {
    console.error("request-payout: unexpected error", err);
    return NextResponse.json(
      { error: err?.message ?? "Unexpected error" },
      { status: 500 },
    );
  }
}
