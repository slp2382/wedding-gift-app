// app/api/printful-webhook/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const supabaseAdmin =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { persistSession: false },
      })
    : null;

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    console.error(
      "[printful webhook] Supabase server environment variables are not configured",
    );
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    console.error("[printful webhook] Failed to parse JSON body", err);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType: string | undefined = body?.type;
  const data = body?.data ?? {};

  // Printful order related webhooks include data.order
  const order = data.order ?? null;
  const printfulOrderId = order?.id as number | string | undefined;
  const orderStatus = order?.status as string | undefined;

  if (!eventType) {
    console.error("[printful webhook] Missing event type");
    return NextResponse.json({ received: true });
  }

  console.log(
    "[printful webhook] Received event",
    eventType,
    "for order",
    printfulOrderId,
    "status",
    orderStatus,
  );

  if (!printfulOrderId) {
    // Some webhooks might not reference an order directly
    console.log(
      "[printful webhook] No order id in payload, nothing to update",
    );
    return NextResponse.json({ received: true });
  }

  // Decide what to write into card_print_jobs
  const updates: Record<string, any> = {
    printful_status: orderStatus ?? eventType,
  };

  // If the event represents shipment or a fully completed order,
  // we can automatically mark the job as shipped
  const normalizedStatus = (orderStatus ?? "").toLowerCase();
  if (
    eventType === "package_shipped" ||
    normalizedStatus === "fulfilled" ||
    normalizedStatus === "shipped"
  ) {
    updates.status = "shipped";
  }

  try {
    const { data: updatedRows, error } = await supabaseAdmin
      .from("card_print_jobs")
      .update(updates)
      .eq("printful_order_id", printfulOrderId)
      .select("id");

    if (error) {
      console.error(
        "[printful webhook] Error updating card_print_jobs",
        error,
      );
      return NextResponse.json(
        { error: "Failed to update print job" },
        { status: 500 },
      );
    }

    if (!updatedRows || updatedRows.length === 0) {
      console.warn(
        "[printful webhook] No card_print_jobs row found for printful_order_id",
        printfulOrderId,
      );
    } else {
      console.log(
        "[printful webhook] Updated card_print_jobs for printful_order_id",
        printfulOrderId,
        "rows",
        updatedRows.map((r) => r.id),
      );
    }
  } catch (err) {
    console.error(
      "[printful webhook] Unexpected error updating card_print_jobs",
      err,
    );
    return NextResponse.json(
      { error: "Unexpected error updating print job" },
      { status: 500 },
    );
  }

  // Always return success so Printful does not retry forever
  return NextResponse.json({ received: true });
}
