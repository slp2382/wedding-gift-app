import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

async function requireAdminSession() {
  const cookieStore = await cookies();
  const v = cookieStore.get("gl_admin_session")?.value;
  return Boolean(v && v.length > 10);
}

export async function GET() {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, created_at, name, rating, title, body, source, is_approved, is_in_rotation")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, reviews: data ?? [] }, { status: 200 });
}

export async function PATCH(req: Request) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const id = typeof payload?.id === "string" ? payload.id : "";
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  }

  const patch: Record<string, any> = {};

  if (typeof payload?.is_approved === "boolean") patch.is_approved = payload.is_approved;
  if (typeof payload?.is_in_rotation === "boolean")
    patch.is_in_rotation = payload.is_in_rotation;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "No fields to update" }, { status: 400 });
  }

  if (patch.is_approved === false) {
    patch.is_in_rotation = false;
  }

  if (patch.is_in_rotation === true) {
    patch.is_approved = true;
  }

  const supabase = createServerClient();
  const { error } = await supabase.from("reviews").update(patch).eq("id", id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function DELETE(req: Request) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { error } = await supabase.from("reviews").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}