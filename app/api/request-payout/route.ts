import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../lib/supabaseServer";
import { sendPayoutRequestAlert } from "../../../lib/smsNotifications";
import crypto from "node:crypto";

export const runtime = "nodejs";

const MAX_PIN_ATTEMPTS = 5;

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
    const body = await req.json();

    const {
      cardId,
      contactName,
      contactEmail,
      payoutMethod,
      payoutDetails,
      pinLast4,
    } = body || {};

    if (!cardId) {
      return NextResponse.json({ error: "cardId is required" }, { status: 400 });
    }

    const pin = normalizeLast4(pinLast4);
    if (!pin) {
      return NextResponse.json(
        { error: "pinLast4 is required and must be exactly 4 digits" },
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

    if (!contactNameClean) {
      return NextResponse.json(
        { error: "contactName is required" },
        { status: 400 },
      );
    }

    if (!contactEmailClean) {
      return NextResponse.json(
        { error: "contactEmail is required" },
        { status: 400 },
      );
    }

    const { data: card, error: cardError } = await supabase
      .from("cards")
      .select(
        "id, card_id, amount, claimed, payout_request_id, claim_pin_hash, claim_pin_attempts, claim_pin_locked",
      )
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
        console.warn("request payout: failed to set locked state", lockErr);
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
      console.error("request payout: pin hash error", e);
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
        console.warn("request payout: failed to update pin attempts", attemptErr);
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
        console.warn("request payout: failed to reset pin state", resetErr);
      }
    }

    if (card.payout_request_id) {
      const { data: existingReq, error: existingReqErr } = await supabase
        .from("payout_requests")
        .select("id,status,payout_method")
        .eq("id", card.payout_request_id)
        .maybeSingle();

      if (existingReqErr) {
        console.warn(
          "request payout: failed to load existing payout request",
          existingReqErr,
        );
      }

      if (existingReq?.id) {
        const existingStatus = String(existingReq.status ?? "")
          .trim()
          .toLowerCase();
        const existingMethod = String(existingReq.payout_method ?? "")
          .trim()
          .toLowerCase();

        const stripeMethods = new Set(["stripe_connect", "bank_transfer"]);
        const terminal = new Set(["paid", "completed", "succeeded"]);

        const isExistingStripe = stripeMethods.has(existingMethod);
        const isRequestedStripe = stripeMethods.has(payoutMethodNorm);

        if (isExistingStripe && isRequestedStripe && !terminal.has(existingStatus)) {
          return NextResponse.json({
            ok: true,
            payoutRequestId: existingReq.id,
            reused: true,
            status: existingReq.status ?? null,
          });
        }

        return NextResponse.json(
          {
            error: "A payout request has already been created for this card.",
            payoutRequestId: existingReq.id,
            status: existingReq.status ?? null,
            payoutMethod: existingReq.payout_method ?? null,
          },
          { status: 400 },
        );
      }

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
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("request payout: insert error", insertError);
      return NextResponse.json(
        { error: "Failed to create payout request" },
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