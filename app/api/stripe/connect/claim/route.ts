// app/api/stripe/connect/claim/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabaseServer";
import { stripe } from "../../../../../lib/stripe";

export const runtime = "nodejs";

const FEE_RATE = 0.035;
const FEE_FIXED_CENTS = 30;

function feeCentsFromGross(grossCents: number): number {
  const pct = Math.round(grossCents * FEE_RATE);
  return Math.max(0, pct + FEE_FIXED_CENTS);
}

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
      console.error("claim: payout_request lookup error", payoutError);
      return NextResponse.json({ error: "Payout request not found" }, { status: 404 });
    }

    const grossAmountCents = payout.payout_amount_cents || 0;
    const currency = payout.payout_currency || "usd";

    const feeCents = feeCentsFromGross(grossAmountCents);
    const netAmountCents = Math.max(0, grossAmountCents - feeCents);

    if (payout.status === "paid") {
      return NextResponse.json({
        ok: true,
        alreadyPaid: true,
        amount: netAmountCents,
        currency,
        grossAmountCents,
        feeCents,
        netAmountCents,
      });
    }

    if (!payout.stripe_connect_account_id) {
      return NextResponse.json(
        { error: "Stripe account is not linked yet for this payout request." },
        { status: 400 },
      );
    }

    if (grossAmountCents <= 0) {
      return NextResponse.json(
        { error: "Payout amount is not valid." },
        { status: 400 },
      );
    }

    if (netAmountCents <= 0) {
      return NextResponse.json(
        {
          error:
            "Payout amount is too small after the GiftLink fee. Please contact support.",
        },
        { status: 400 },
      );
    }

    // Create a transfer from your platform to the connected account
    const transfer = await stripe.transfers.create({
      amount: netAmountCents,
      currency,
      destination: payout.stripe_connect_account_id,
      metadata: {
        payout_request_id: payout.id,
        card_id: payout.card_id,
        source: "giftlink_claim",
        gross_amount_cents: String(grossAmountCents),
        fee_cents: String(feeCents),
        net_amount_cents: String(netAmountCents),
        fee_rate: String(FEE_RATE),
        fee_fixed_cents: String(FEE_FIXED_CENTS),
      },
    });

    // Mark payout request as paid
    const { error: updatePayoutError } = await supabase
      .from("payout_requests")
      .update({ status: "paid" })
      .eq("id", payout.id);

    if (updatePayoutError) {
      console.error("claim: failed to update payout_requests status", updatePayoutError);
    }

    // Mark card as claimed
    const { error: updateCardError } = await supabase
      .from("cards")
      .update({ claimed: true })
      .eq("card_id", payout.card_id);

    if (updateCardError) {
      console.error("claim: failed to update card claimed flag", updateCardError);
    }

    return NextResponse.json({
      ok: true,
      amount: netAmountCents,
      currency,
      grossAmountCents,
      feeCents,
      netAmountCents,
      transferId: transfer.id,
    });
  } catch (err: any) {
    console.error("claim: unexpected error", err);
    return NextResponse.json(
      { error: err?.message ?? "Unexpected error while creating Stripe payout" },
      { status: 500 },
    );
  }
}
