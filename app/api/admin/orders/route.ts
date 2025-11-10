import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin: SupabaseClient | null =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

export async function GET() {
  if (!supabaseAdmin) {
    console.error(
      "Admin orders route is not configured, missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
    return NextResponse.json(
      { error: "Server is not configured for admin orders" },
      { status: 500 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching orders", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 },
    );
  }

  return NextResponse.json({ orders: data });
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    console.error(
      "Admin orders route is not configured, missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
    return NextResponse.json(
      { error: "Server is not configured for admin orders" },
      { status: 500 },
    );
  }

  try {
    const body = await req.json();
    const { id, status } = body as { id?: string; status?: string };

    if (!id || !status) {
      return NextResponse.json(
        { error: "Missing id or status" },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin
      .from("orders")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Error updating order status", error);
      return NextResponse.json(
        { error: "Failed to update order status" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error in admin orders POST", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 },
    );
  }
}
