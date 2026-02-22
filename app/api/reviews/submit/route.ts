import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

function clampRating(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  const r = Math.round(n);
  if (r < 1 || r > 5) return null;
  return r;
}

export async function POST(req: Request) {
  const supabase = createServerClient();

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof payload?.name === "string" ? payload.name.trim() : "";
  const title = typeof payload?.title === "string" ? payload.title.trim() : "";
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  const rating = clampRating(payload?.rating);

  if (!body || body.length < 10) {
    return NextResponse.json(
      { ok: false, error: "Review is too short" },
      { status: 400 },
    );
  }

  if (body.length > 1200) {
    return NextResponse.json(
      { ok: false, error: "Review is too long" },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("reviews").insert({
    name: name || null,
    title: title || null,
    body,
    rating,
    source: "site",
    is_approved: false,
    is_in_rotation: false,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}