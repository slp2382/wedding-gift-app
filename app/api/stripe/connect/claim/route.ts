// app/api/stripe/connect/claim/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabaseServer";
import { stripe } from "../../../../../lib/stripe";
import crypto from "node:crypto";

export const runtime = "nodejs";

const FEE_RATE = 0.035;
const FEE_FIXED_CENTS = 30;

const MAX_PIN_ATTEMPTS = 5;

function feeCentsFromGross(grossCents: number): number {
  const pct = Math.round(grossCents * FEE_RATE);
  return Math.max(0, pct + FEE_FIXED_CENTS);
}

function normalizeLast4(value: unknown) {
  const s = String(value ?? "").trim();
  return /^\d{4}$/.test(s) ? s : null;
}

function hashPinLast4(pinLast4: string): string {
  const salt = process.env.CLAIM_PIN_SALT ?? "";
  if (!salt) throw new Error("CLAIM_PIN_SALT is not configured");
  return crypto.createHmac("sha256", salt).update(pinLast4).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await req.json().catch(() => null);

    const { payoutRequestId, pinLast4 } = (body || {}) as {
      payoutRequestId?: string;
      pinLast4?: string;
    };

    if (!payoutRequestId) {
      return NextResponse.json(
        { error: "payoutRequestId is required" },
        { status: 400 },
      );
    }

    const pin = normalizeLast4(pinLast4);
    if (!pin) {
      return NextResponse.json(
        { error: "pinLast4 is required and must be exactly 4 digits" },
        { status: 400 },
      );
    }

    const { data: payout, error: payoutError } = await supabase
      .from("payout_requests")
      .select(
        "id, card_id, payout_amount_cents, payout_currency, stripe_connect_account_id, status",
      )
      .eq("id", payoutRequestId)
      .single();

    if (payoutError || !payout) {
      console.error("claim: payout_request lookup error", payoutError);
      return NextResponse.json(
        { error: "Payout request not found" },
        { status: 404 },
      );
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
            "Payout amount is too small after the givio fee. Please contact support.",
        },
        { status: 400 },
      );
    }

    const { data: card, error: cardError } = await supabase
      .from("cards")
      .select("id, card_id, claimed, claim_pin_hash, claim_pin_attempts, claim_pin_locked")
      .eq("card_id", payout.card_id)
      .single();

    if (cardError || !card) {
      console.error("claim: card lookup error", cardError);
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    if (card.claim_pin_locked) {
      return NextResponse.json(
        {
          error:
            "Too many incorrect PIN attempts. Please contact givio cards support.",
          locked: true,
        },
        { status: 403 },
      );
    }

    const storedHash =
      typeof (card as any).claim_pin_hash === "string"
        ? (card as any).claim_pin_hash
        : null;

    if (!storedHash) {
      return NextResponse.json(
        {
          error:
            "This card is missing its claim PIN. Please contact givio cards support.",
        },
        { status: 400 },
      );
    }

    const attemptsRaw = Number((card as any).claim_pin_attempts ?? 0);
    const attempts = Number.isFinite(attemptsRaw) ? Math.max(0, attemptsRaw) : 0;

    if (attempts >= MAX_PIN_ATTEMPTS) {
      const { error: lockErr } = await supabase
        .from("cards")
        .update({ claim_pin_locked: true })
        .eq("id", card.id);

      if (lockErr) {
        console.warn("claim: failed to set locked state", lockErr);
      }

      return NextResponse.json(
        {
          error:
            "Too many incorrect PIN attempts. Please contact givio cards support.",
          locked: true,
        },
        { status: 403 },
      );
    }

    let submittedHash: string;
    try {
      submittedHash = hashPinLast4(pin);
    } catch (e) {
      console.error("claim: pin hash error", e);
      return NextResponse.json(
        { error: "Server not configured. Please contact givio cards support." },
        { status: 500 },
      );
    }

    if (submittedHash !== storedHash) {
      const nextAttempts = attempts + 1;
      const willLock = nextAttempts >= MAX_PIN_ATTEMPTS;

      const { error: attemptErr } = await supabase
        .from("cards")
        .update({
          claim_pin_attempts: nextAttempts,
          claim_pin_locked: willLock,
        })
        .eq("id", card.id);

      if (attemptErr) {
        console.warn("claim: failed to update pin attempts", attemptErr);
      }

      const remaining = Math.max(0, MAX_PIN_ATTEMPTS - nextAttempts);

      return NextResponse.json(
        willLock
          ? {
              error:
                "Too many incorrect PIN attempts. Please contact givio cards support.",
              locked: true,
            }
          : {
              error: `Incorrect PIN. You have ${remaining} attempts remaining.`,
              attemptsRemaining: remaining,
            },
        { status: 403 },
      );
    }

    if (attempts !== 0 || card.claim_pin_locked) {
      const { error: resetErr } = await supabase
        .from("cards")
        .update({ claim_pin_attempts: 0, claim_pin_locked: false })
        .eq("id", card.id);

      if (resetErr) {
        console.warn("claim: failed to reset pin state", resetErr);
      }
    }

    const transfer = await stripe.transfers.create({
      amount: netAmountCents,
      currency,
      destination: payout.stripe_connect_account_id,
      metadata: {
        payout_request_id: payout.id,
        card_id: payout.card_id,
        source: "givio_claim",
        gross_amount_cents: String(grossAmountCents),
        fee_cents: String(feeCents),
        net_amount_cents: String(netAmountCents),
        fee_rate: String(FEE_RATE),
        fee_fixed_cents: String(FEE_FIXED_CENTS),
      },
    });

    const { error: updatePayoutError } = await supabase
      .from("payout_requests")
      .update({ status: "paid" })
      .eq("id", payout.id);

    if (updatePayoutError) {
      console.error(
        "claim: failed to update payout_requests status",
        updatePayoutError,
      );
    }

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