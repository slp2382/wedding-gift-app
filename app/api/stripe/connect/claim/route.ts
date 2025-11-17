// app/api/stripe/connect/claim/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabaseServer";
import { stripe } from "../../../../../lib/stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await req.json();
    const { payoutRequestId } = body || {};

    if (!payoutRequestId) {
      return NextResponse.json(
        { error: "payoutRequestId is required" },
        { status: 400 },
      );
    }

    // Look up payout request and related card
    const { data: payout, error: payoutError } = await supabase
      .from("payout_requests")
      .select(
        "id, card_id, payout_amount_cents, payout_currency, stripe_connect_account_id, status",
      )
      .eq("id", payoutRequestId)
      .single();

    if (payoutError || !payout) {
      console.error(
        "claim: payout_request lookup error",
        payoutError,
      );
      return NextResponse.json(
        { error: "Payout request not found" },
        { status: 404 },
      );
    }

    if (payout.status === "paid") {
      return NextResponse.json({
        ok: true,
        amount: payout.payout_amount_cents,
        currency: payout.payout_currency || "usd",
        alreadyPaid: true,
      });
    }

    if (!payout.stripe_connect_account_id) {
      return NextResponse.json(
        {
          error:
            "Stripe account is not linked yet for this payout request.",
        },
        { status: 400 },
      );
    }

    const amount = payout.payout_amount_cents || 0;
    if (amount <= 0) {
      return NextResponse.json(
        { error: "Payout amount is not valid." },
        { status: 400 },
      );
    }

    const currency = payout.payout_currency || "usd";

    // Create a transfer from your platform to the connected account
    const transfer = await stripe.transfers.create({
      amount,
      currency,
      destination: payout.stripe_connect_account_id,
      metadata: {
        payout_request_id: payout.id,
        card_id: payout.card_id,
        source: "giftlink_claim",
      },
    });

    // Mark payout request as paid
    const { error: updatePayoutError } = await supabase
      .from("payout_requests")
      .update({
        status: "paid",
      })
      .eq("id", payout.id);

    if (updatePayoutError) {
      console.error(
        "claim: failed to update payout_requests status",
        updatePayoutError,
      );
    }

    // Mark card as claimed
    const { error: updateCardError } = await supabase
      .from("cards")
      .update({ claimed: true })
      .eq("card_id", payout.card_id);

    if (updateCardError) {
      console.error(
        "claim: failed to update card claimed flag",
        updateCardError,
      );
    }

    return NextResponse.json({
      ok: true,
      amount,
      currency,
      transferId: transfer.id,
    });
  } catch (err: any) {
    console.error("claim: unexpected error", err);
    return NextResponse.json(
      {
        error:
          err?.message ??
          "Unexpected error while creating Stripe payout",
      },
      { status: 500 },
    );
  }
}
