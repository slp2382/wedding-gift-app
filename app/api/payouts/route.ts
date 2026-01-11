import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const COOKIE_NAME = "gl_admin_session";

function requireAdmin(req: NextRequest) {
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true as const };
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

// GET returns pending Venmo payout requests only
export async function GET(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { data: payoutRows, error: payoutError } = await supabaseAdmin
      .from("payout_requests")
      .select("id, card_id, contact_name, contact_email, payout_method, payout_details, status, created_at")
      .eq("payout_method", "venmo")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (payoutError) {
      return NextResponse.json({ error: payoutError.message }, { status: 500 });
    }

    const payouts = payoutRows ?? [];
    const cardIds = payouts.map((p) => p.card_id);

    let cardAmountMap: Record<string, number | null> = {};
    if (cardIds.length) {
      const { data: cards, error: cardError } = await supabaseAdmin
        .from("cards")
        .select("card_id, amount")
        .in("card_id", cardIds);

      if (cardError) {
        return NextResponse.json({ error: cardError.message }, { status: 500 });
      }

      for (const row of cards ?? []) {
        cardAmountMap[row.card_id] = row.amount ?? null;
      }
    }

    return NextResponse.json({ payouts, cardAmountMap });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH marks a Venmo request as completed
export async function PATCH(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  try {
    const body = (await req.json().catch(() => null)) as { id?: string } | null;
    const id = body?.id;

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { error } = await supabaseAdmin
      .from("payout_requests")
      .update({ status: "completed" })
      .eq("id", id)
      .eq("payout_method", "venmo");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
