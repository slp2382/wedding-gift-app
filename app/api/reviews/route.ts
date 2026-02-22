import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("reviews")
    .select("id, name, rating, title, body, created_at")
    .eq("is_approved", true)
    .eq("is_in_rotation", true)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, reviews: data ?? [] },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=60",
      },
    },
  );
}