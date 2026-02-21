// app/api/claim-gift/route.ts
import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

export const runtime = "nodejs";

const MAX_PIN_ATTEMPTS = 5;

function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase admin env not configured");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
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

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { cardId, pinLast4 } = body as { cardId?: string; pinLast4?: string };

  if (!cardId) {
    return NextResponse.json({ error: "cardId is required." }, { status: 400 });
  }

  const pin = normalizeLast4(pinLast4);
  if (!pin) {
    return NextResponse.json(
      { error: "pinLast4 is required and must be exactly 4 digits." },
      { status: 400 },
    );
  }

  let supabaseAdmin: SupabaseClient;
  try {
    supabaseAdmin = getSupabaseAdmin();
  } catch (e) {
    console.error("claim-gift supabase admin init error", e);
    return NextResponse.json(
      { error: "Server not configured. Please contact givio cards support." },
      { status: 500 },
    );
  }

  const { data: card, error: readError } = await supabaseAdmin
    .from("cards")
    .select(
      "id, card_id, claimed, funded, amount, claim_pin_hash, claim_pin_attempts, claim_pin_locked",
    )
    .eq("card_id", cardId)
    .single();

  if (readError || !card) {
    console.error("claim-gift card lookup error", readError);
    return NextResponse.json({ error: "Card not found." }, { status: 404 });
  }

  if (card.claimed) {
    return NextResponse.json(
      { error: "This card has already been claimed." },
      { status: 400 },
    );
  }

  const funded = Boolean((card as any).funded) || Number((card as any).amount ?? 0) > 0;
  if (!funded) {
    return NextResponse.json(
      { error: "This card is not funded yet." },
      { status: 400 },
    );
  }

  const locked = Boolean((card as any).claim_pin_locked);
  if (locked) {
    return NextResponse.json(
      {
        error:
          "Too many incorrect PIN attempts. Please contact givio cards support.",
        locked: true,
      },
      { status: 403 },
    );
  }

  const storedHash = typeof (card as any).claim_pin_hash === "string" ? (card as any).claim_pin_hash : null;
  if (!storedHash) {
    return NextResponse.json(
      {
        error:
          "This card is missing its claim PIN. Please contact givio cards support.",
      },
      { status: 400 },
    );
  }

  let submittedHash: string;
  try {
    submittedHash = hashPinLast4(pin);
  } catch (e) {
    console.error("claim-gift hash error", e);
    return NextResponse.json(
      { error: "Server not configured. Please contact givio cards support." },
      { status: 500 },
    );
  }

  const attemptsRaw = Number((card as any).claim_pin_attempts ?? 0);
  const attempts = Number.isFinite(attemptsRaw) ? Math.max(0, attemptsRaw) : 0;

  if (attempts >= MAX_PIN_ATTEMPTS) {
    const { error: lockErr } = await supabaseAdmin
      .from("cards")
      .update({ claim_pin_locked: true })
      .eq("id", (card as any).id);

    if (lockErr) {
      console.warn("claim-gift failed to set locked state", lockErr);
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

  if (submittedHash !== storedHash) {
    const nextAttempts = attempts + 1;
    const willLock = nextAttempts >= MAX_PIN_ATTEMPTS;

    const { error: attemptErr } = await supabaseAdmin
      .from("cards")
      .update({
        claim_pin_attempts: nextAttempts,
        claim_pin_locked: willLock,
      })
      .eq("id", (card as any).id);

    if (attemptErr) {
      console.warn("claim-gift failed to update pin attempts", attemptErr);
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

  const { data: updated, error: claimError } = await supabaseAdmin
    .from("cards")
    .update({
      claimed: true,
      claim_pin_attempts: 0,
      claim_pin_locked: false,
    })
    .eq("id", (card as any).id)
    .select()
    .single();

  if (claimError) {
    console.error("Error claiming gift", claimError);
    return NextResponse.json(
      { error: "Failed to mark gift as claimed." },
      { status: 500 },
    );
  }

  return NextResponse.json({ card: updated });
}