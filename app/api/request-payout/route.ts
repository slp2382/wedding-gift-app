import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../lib/supabaseServer";
import { sendPayoutRequestAlert } from "../../../lib/smsNotifications";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await req.json();

    const { cardId, contactName, contactEmail, payoutMethod, payoutDetails } =
      body || {};

    if (!cardId) {
      return NextResponse.json({ error: "cardId is required" }, { status: 400 });
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

    const payoutMethodNorm = String(payoutMethod).trim().toLowerCase();

    if (
      payoutMethodNorm !== "venmo" &&
      payoutMethodNorm !== "stripe_connect" &&
      payoutMethodNorm !== "bank_transfer"
    ) {
      return NextResponse.json(
        { error: "Invalid payoutMethod" },
        { status: 400 },
      );
    }

    const contactNameClean = String(contactName).trim();
    const contactEmailClean = String(contactEmail).trim();

    const { data: card, error: cardError } = await supabase
      .from("cards")
      .select("id, card_id, amount, claimed, payout_request_id")
      .eq("card_id", cardId)
      .single();

    if (cardError || !card) {
      console.error("request payout: card lookup error", cardError);
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    if (card.claimed) {
      return NextResponse.json(
        { error: "This card has already been claimed." },
        { status: 400 },
      );
    }

    if (card.payout_request_id) {
      return NextResponse.json(
        { error: "A payout request has already been created for this card." },
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

    const { data: inserted, error: insertError } = await supabase
      .from("payout_requests")
      .insert({
        card_id: card.card_id,
        contact_name: contactNameClean,
        contact_email: contactEmailClean,
        payout_method: payoutMethodNorm,
        payout_details: payoutDetails || null,
        status: payoutMethodNorm === "venmo" ? "pending" : "not_onboarded",
        payout_amount_cents: amountCents,
        payout_currency: "usd",
        stripe_connect_status:
          payoutMethodNorm === "stripe_connect" ? "not_onboarded" : "not_onboarded",
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("request payout: insert error", insertError);
      return NextResponse.json(
        { error: "Failed to create payout request." },
        { status: 500 },
      );
    }

    const payoutRequestId = inserted.id as string;

    const { error: updateCardError } = await supabase
      .from("cards")
      .update({
        payout_request_id: payoutRequestId,
      })
      .eq("id", card.id)
      .is("payout_request_id", null);

    if (updateCardError) {
      console.warn(
        "request payout: failed to link card to payout request",
        updateCardError,
      );
    }

    if (payoutMethodNorm === "venmo") {
      void sendPayoutRequestAlert({
        payoutRequestId,
        cardId: card.card_id,
        payoutMethod: payoutMethodNorm,
        contactName: contactNameClean,
        contactEmail: contactEmailClean,
        payoutAmountCents: amountCents,
      }).catch((err) => {
        console.error("request payout: failed to send payout SMS alert", err);
      });
    }

    return NextResponse.json({
      ok: true,
      payoutRequestId,
    });
  } catch (err: any) {
    console.error("request payout: unexpected error", err);
    return NextResponse.json(
      { error: err?.message ?? "Unexpected error" },
      { status: 500 },
    );
  }
}
