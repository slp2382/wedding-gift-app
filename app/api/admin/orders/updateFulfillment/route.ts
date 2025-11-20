// app/api/admin/orders/updateFulfillment/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Admin orders update route is not configured, missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
  );
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) as
      | { jobId?: string; fulfillmentStatus?: string }
      | null;

    if (!body?.jobId || !body?.fulfillmentStatus) {
      return NextResponse.json(
        { error: "jobId and fulfillmentStatus are required" },
        { status: 400 },
      );
    }

    const allowed = ["pending", "processing", "shipped", "error"];
    if (!allowed.includes(body.fulfillmentStatus)) {
      return NextResponse.json(
        { error: "Invalid fulfillmentStatus" },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin
      .from("card_print_jobs")
      .update({ fulfillment_status: body.fulfillmentStatus })
      .eq("id", body.jobId);

    if (error) {
      console.error(
        "[admin orders update] Error updating fulfillment_status",
        error,
      );
      return NextResponse.json(
        { error: "Failed to update fulfillment status" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin orders update] Unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected error updating fulfillment status" },
      { status: 500 },
    );
  }
}
