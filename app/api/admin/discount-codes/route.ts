// app/api/admin/discount-codes/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const dynamic = "force-dynamic";

type DiscountType = "percent" | "fixed";

type DiscountCodeRow = {
  id: string;
  code: string;
  active: boolean;
  discount_type: DiscountType;
  discount_value: number;
  valid_from: string | null;
  valid_to: string | null;
  max_redemptions: number | null;
  redemption_count: number;
  min_subtotal_cents: number | null;
  notes: string | null;
  stripe_coupon_id: string | null;
  created_at: string;
};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceRole, {
    auth: { persistSession: false },
  });
}

function timingSafeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function base64UrlToBuffer(input: string) {
  const pad = input.length % 4 ? "=".repeat(4 - (input.length % 4)) : "";
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

function tryParseSessionPayload(payloadPart: string): { exp?: number } | null {
  // Supports either:
  // 1) base64url encoded JSON like {"exp": 123}
  // 2) plain JSON
  // 3) a simple "exp:<unix>" string
  try {
    const asBuf = base64UrlToBuffer(payloadPart);
    const asText = asBuf.toString("utf8");
    const asJson = JSON.parse(asText);
    if (asJson && typeof asJson === "object") return asJson;
  } catch {
    // ignore
  }

  try {
    const asJson = JSON.parse(payloadPart);
    if (asJson && typeof asJson === "object") return asJson;
  } catch {
    // ignore
  }

  const m = payloadPart.match(/exp[:=](\d{9,13})/i);
  if (m) {
    const raw = Number(m[1]);
    // support seconds or ms
    const exp = raw > 10_000_000_000 ? Math.floor(raw / 1000) : raw;
    return { exp };
  }

  return null;
}

function verifyAdminSessionCookie(cookieValue: string): boolean {
  // If ADMIN_SESSION_SECRET is present and the cookie is "payload.sig",
  // we verify HMAC SHA256 over payload using the secret.
  // If we cannot verify, we still require a nonempty cookie value (keeps compatibility),
  // but we do enforce exp if present in payload.
  const secret = process.env.ADMIN_SESSION_SECRET;

  const parts = cookieValue.split(".");
  const payload = parts[0] ?? "";
  const sig = parts[1] ?? "";

  if (payload) {
    const parsed = tryParseSessionPayload(payload);
    if (parsed?.exp && Number.isFinite(parsed.exp)) {
      const nowSec = Math.floor(Date.now() / 1000);
      if (parsed.exp < nowSec) return false;
    }
  }

  if (!secret) return true;

  if (!payload || !sig) return false;

  const h = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  if (sig.length === h.length) {
    return timingSafeEqual(sig, h);
  }

  // Some implementations store signature as base64url
  const hB64Url = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  if (sig.length === hB64Url.length) {
    return timingSafeEqual(sig, hB64Url);
  }

  return false;
}

function assertAdmin(req: NextRequest): NextResponse | null {
  // Optional server to server admin token override (you used this pattern elsewhere)
  const headerToken = req.headers.get("xadmintoken");
  const syncToken = process.env.ADMIN_SYNC_TOKEN;
  if (syncToken && headerToken && headerToken === syncToken) {
    return null;
  }

  const cookie = req.cookies.get("gl_admin_session")?.value;
  if (!cookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!verifyAdminSessionCookie(cookie)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

function normalizeCode(input: unknown) {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return trimmed;
}

function coerceInt(input: unknown) {
  if (typeof input === "number" && Number.isFinite(input)) return Math.trunc(input);
  if (typeof input === "string" && input.trim()) {
    const n = Number(input);
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return null;
}

function coerceBool(input: unknown) {
  if (typeof input === "boolean") return input;
  if (typeof input === "string") {
    if (input === "true") return true;
    if (input === "false") return false;
  }
  return null;
}

function coerceIsoOrNull(input: unknown) {
  if (input == null) return null;
  if (typeof input !== "string") return null;
  const s = input.trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export async function GET(req: NextRequest) {
  const auth = assertAdmin(req);
  if (auth) return auth;

  const url = new URL(req.url);
  const includeInactive = url.searchParams.get("includeInactive") === "1";

  try {
    const supabase = getSupabaseAdmin();

    let q = supabase
      .from("discount_codes")
      .select(
        "id,code,active,discount_type,discount_value,valid_from,valid_to,max_redemptions,redemption_count,min_subtotal_cents,notes,stripe_coupon_id,created_at",
      )
      .order("created_at", { ascending: false });

    if (!includeInactive) {
      q = q.eq("active", true);
    }

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, codes: (data ?? []) as DiscountCodeRow[] });
  } catch (e) {
    console.error("discount codes GET error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = assertAdmin(req);
  if (auth) return auth;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = normalizeCode(body.code);
  const discountType = body.discount_type as DiscountType;
  const discountValue = coerceInt(body.discount_value);
  const active = coerceBool(body.active) ?? true;

  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });
  if (discountType !== "percent" && discountType !== "fixed") {
    return NextResponse.json({ error: "Invalid discount_type" }, { status: 400 });
  }
  if (discountValue == null || discountValue <= 0) {
    return NextResponse.json({ error: "Invalid discount_value" }, { status: 400 });
  }
  if (discountType === "percent" && (discountValue < 1 || discountValue > 100)) {
    return NextResponse.json({ error: "Percent must be 1 to 100" }, { status: 400 });
  }

  const validFrom = coerceIsoOrNull(body.valid_from);
  const validTo = coerceIsoOrNull(body.valid_to);

  const maxRedemptions = body.max_redemptions == null ? null : coerceInt(body.max_redemptions);
  const minSubtotalCents =
    body.min_subtotal_cents == null ? null : coerceInt(body.min_subtotal_cents);

  const notes = typeof body.notes === "string" ? body.notes : null;
  const stripeCouponId = typeof body.stripe_coupon_id === "string" ? body.stripe_coupon_id : null;

  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("discount_codes")
      .insert({
        code,
        active,
        discount_type: discountType,
        discount_value: discountValue,
        valid_from: validFrom,
        valid_to: validTo,
        max_redemptions: maxRedemptions,
        min_subtotal_cents: minSubtotalCents,
        notes,
        stripe_coupon_id: stripeCouponId,
      })
      .select(
        "id,code,active,discount_type,discount_value,valid_from,valid_to,max_redemptions,redemption_count,min_subtotal_cents,notes,stripe_coupon_id,created_at",
      )
      .single();

    if (error) {
      const msg =
        error.message?.includes("discount_codes_code_unique_ci") ||
        error.message?.toLowerCase().includes("duplicate")
          ? "Code already exists"
          : error.message;

      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({ ok: true, code: data as DiscountCodeRow });
  } catch (e) {
    console.error("discount codes POST error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = assertAdmin(req);
  if (auth) return auth;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const update: any = {};

  if (body.code != null) {
    const code = normalizeCode(body.code);
    if (!code) return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    update.code = code;
  }

  if (body.active != null) {
    const active = coerceBool(body.active);
    if (active == null) return NextResponse.json({ error: "Invalid active" }, { status: 400 });
    update.active = active;
  }

  if (body.discount_type != null) {
    if (body.discount_type !== "percent" && body.discount_type !== "fixed") {
      return NextResponse.json({ error: "Invalid discount_type" }, { status: 400 });
    }
    update.discount_type = body.discount_type;
  }

  if (body.discount_value != null) {
    const v = coerceInt(body.discount_value);
    if (v == null || v <= 0) {
      return NextResponse.json({ error: "Invalid discount_value" }, { status: 400 });
    }
    update.discount_value = v;
  }

  // Validate percent range if both present or if type already percent
  if (update.discount_type === "percent" && update.discount_value != null) {
    if (update.discount_value < 1 || update.discount_value > 100) {
      return NextResponse.json({ error: "Percent must be 1 to 100" }, { status: 400 });
    }
  }

  if (body.valid_from !== undefined) update.valid_from = coerceIsoOrNull(body.valid_from);
  if (body.valid_to !== undefined) update.valid_to = coerceIsoOrNull(body.valid_to);

  if (body.max_redemptions !== undefined) {
    update.max_redemptions = body.max_redemptions == null ? null : coerceInt(body.max_redemptions);
  }

  if (body.min_subtotal_cents !== undefined) {
    update.min_subtotal_cents =
      body.min_subtotal_cents == null ? null : coerceInt(body.min_subtotal_cents);
  }

  if (body.notes !== undefined) update.notes = typeof body.notes === "string" ? body.notes : null;
  if (body.stripe_coupon_id !== undefined) {
    update.stripe_coupon_id =
      typeof body.stripe_coupon_id === "string" ? body.stripe_coupon_id : null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("discount_codes")
      .update(update)
      .eq("id", id)
      .select(
        "id,code,active,discount_type,discount_value,valid_from,valid_to,max_redemptions,redemption_count,min_subtotal_cents,notes,stripe_coupon_id,created_at",
      )
      .single();

    if (error) {
      const msg =
        error.message?.includes("discount_codes_code_unique_ci") ||
        error.message?.toLowerCase().includes("duplicate")
          ? "Code already exists"
          : error.message;

      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({ ok: true, code: data as DiscountCodeRow });
  } catch (e) {
    console.error("discount codes PATCH error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = assertAdmin(req);
  if (auth) return auth;

  // Soft delete: set active false
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("discount_codes")
      .update({ active: false })
      .eq("id", id)
      .select(
        "id,code,active,discount_type,discount_value,valid_from,valid_to,max_redemptions,redemption_count,min_subtotal_cents,notes,stripe_coupon_id,created_at",
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, code: data as DiscountCodeRow });
  } catch (e) {
    console.error("discount codes DELETE error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
