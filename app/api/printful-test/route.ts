// app/api/printful-test/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createPrintfulOrderForCard } from "@/lib/printful";

export const runtime = "nodejs";

/**
 * Test endpoint to manually trigger a Printful order for a given cardId.
 * Usage:
 *   GET /api/printful-test?cardId=card_abc123
 *
 * This is for debugging only and should not be used by end users.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cardId = searchParams.get("cardId") ?? "card_demo123";

  // Do env checks *inside* the handler, not at module load, so build does not break.
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const printfulApiKey = process.env.PRINTFUL_API_KEY;
  const printfulSyncVariantId = process.env.PRINTFUL_SYNC_VARIANT_ID;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("[printful-test] Missing Supabase server env vars");
    return NextResponse.json(
      { ok: false, error: "Supabase server env vars missing" },
      { status: 500 },
    );
  }

  if (!printfulApiKey || !printfulSyncVariantId) {
    console.error("[printful-test] Missing Printful env vars");
    return NextResponse.json(
      { ok: false, error: "Printful env vars missing" },
      { status: 500 },
    );
  }

  try {
    console.log("[printful-test] Triggering createPrintfulOrderForCard for", cardId);

    const { printfulOrderId, status, raw } = await createPrintfulOrderForCard(cardId);

    console.log(
      "[printful-test] Printful order created",
      printfulOrderId,
      status,
    );

    return NextResponse.json(
      {
        ok: true,
        cardId,
        printfulOrderId,
        status,
        raw,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[printful-test] Error creating Printful order for", cardId, err);

    const message =
      err instanceof Error ? err.message : JSON.stringify(err);

    return NextResponse.json(
      {
        ok: false,
        cardId,
        error: message,
      },
      { status: 500 },
    );
  }
}
