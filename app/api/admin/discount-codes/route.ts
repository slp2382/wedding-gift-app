// app/api/admin/discount-codes/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const dynamic = "force-dynamic";

type DiscountType = "percent" | "fixed" | "partner_tiered_unit_price";

type PartnerTier = {
  min_qty: number;
  max_qty: number | null;
  unit_price_cents: number;
};

type DiscountCodeRow = {
  id: string;
  code: string;
  active: boolean;
  discount_type: DiscountType;
  discount_value: number | null;
  valid_from: string | null;
  valid_to: string | null;
  max_redemptions: number | null;
  redemption_count: number;
  min_subtotal_cents: number | null;
  notes: string | null;
  stripe_coupon_id: string | null;
  partner_moq: number | null;
  partner_tiers: PartnerTier[] | null;
  created_at: string;
};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceRole, { auth: { persistSession: false } });
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
  try {
    const asBuf = base64UrlToBuffer(payloadPart);
    const asText = asBuf.toString("utf8");
    const asJson = JSON.parse(asText);
    if (asJson && typeof asJson === "object") return asJson;
  } catch {}

  try {
    const asJson = JSON.parse(payloadPart);
    if (asJson && typeof asJson === "object") return asJson;
  } catch {}

  const m = payloadPart.match(/exp[:=](\d{9,13})/i);
  if (m) {
    const raw = Number(m[1]);
    const exp = raw > 10_000_000_000 ? Math.floor(raw / 1000) : raw;
    return { exp };
  }

  return null;
}

function verifyAdminSessionCookie(cookieValue: string): boolean {
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

  const hHex = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  if (sig.length === hHex.length) return timingSafeEqual(sig, hHex);

  const hB64Url = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  if (sig.length === hB64Url.length) return timingSafeEqual(sig, hB64Url);

  return false;
}

function assertAdmin(req: NextRequest): NextResponse | null {
  const headerToken = req.headers.get("xadmintoken");
  const syncToken = process.env.ADMIN_SYNC_TOKEN;
  if (syncToken && headerToken && headerToken === syncToken) {
    return null;
  }

  const cookie = req.cookies.get("gl_admin_session")?.value;
  if (!cookie) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

function buildCompatListResponse(rows: DiscountCodeRow[]) {
  return NextResponse.json({
    ok: true,
    rows,
    codes: rows,
    data: rows,
  });
}

function getIdFromReq(req: NextRequest, body: any): string | null {
  const url = new URL(req.url);
  return url.searchParams.get("id") || body?.id || null;
}

function parsePartnerTiers(value: unknown): PartnerTier[] {
  if (!Array.isArray(value)) return [];
  const tiers: PartnerTier[] = [];

  for (const t of value) {
    if (!t || typeof t !== "object") continue;
    const anyT = t as Record<string, unknown>;

    const minQty = Number(anyT.min_qty);
    const maxQtyRaw = anyT.max_qty;
    const maxQty =
      maxQtyRaw === null || maxQtyRaw === undefined ? null : Number(maxQtyRaw);
    const unit = Number(anyT.unit_price_cents);

    if (!Number.isFinite(minQty) || minQty <= 0) continue;
    if (maxQty !== null && (!Number.isFinite(maxQty) || maxQty < minQty)) continue;
    if (!Number.isFinite(unit) || unit <= 0) continue;

    tiers.push({ min_qty: minQty, max_qty: maxQty, unit_price_cents: unit });
  }

  tiers.sort((a, b) => a.min_qty - b.min_qty);
  return tiers;
}

function validatePartnerTiers(tiers: PartnerTier[]) {
  if (tiers.length === 0) return "partner_tiers is required";

  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    if (t.max_qty !== null && t.max_qty < t.min_qty) {
      return "partner_tiers has an invalid max_qty";
    }
    if (t.unit_price_cents <= 0) {
      return "partner_tiers has an invalid unit_price_cents";
    }
    if (i > 0) {
      const prev = tiers[i - 1];
      const prevMax = prev.max_qty;
      if (prevMax === null) {
        return "partner_tiers cannot have tiers after an open ended tier";
      }
      if (t.min_qty <= prevMax) {
        return "partner_tiers tiers overlap";
      }
    }
  }

  return null;
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
        "id,code,active,discount_type,discount_value,valid_from,valid_to,max_redemptions,redemption_count,min_subtotal_cents,notes,stripe_coupon_id,partner_moq,partner_tiers,created_at",
      )
      .order("created_at", { ascending: false });

    if (!includeInactive) q = q.eq("active", true);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data ?? []).map((r: any) => {
      const tiers = parsePartnerTiers(r.partner_tiers);
      return { ...r, partner_tiers: tiers.length ? tiers : null } as DiscountCodeRow;
    });

    return buildCompatListResponse(rows);
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
  const discountValue = body.discount_value === undefined ? null : coerceInt(body.discount_value);
  const active = coerceBool(body.active) ?? true;

  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });
  if (discountType !== "percent" && discountType !== "fixed" && discountType !== "partner_tiered_unit_price") {
    return NextResponse.json({ error: "Invalid discount_type" }, { status: 400 });
  }

  const validFrom = coerceIsoOrNull(body.valid_from);
  const validTo = coerceIsoOrNull(body.valid_to);

  const maxRedemptions = body.max_redemptions == null ? null : coerceInt(body.max_redemptions);
  const minSubtotalCents =
    body.min_subtotal_cents == null ? null : coerceInt(body.min_subtotal_cents);

  const notes = typeof body.notes === "string" ? body.notes : null;
  const stripeCouponId = typeof body.stripe_coupon_id === "string" ? body.stripe_coupon_id : null;

  const insert: any = {
    code,
    active,
    discount_type: discountType,
    valid_from: validFrom,
    valid_to: validTo,
    max_redemptions: maxRedemptions,
    min_subtotal_cents: minSubtotalCents,
    notes,
    stripe_coupon_id: stripeCouponId,
  };

  if (discountType === "percent" || discountType === "fixed") {
    if (discountValue == null || discountValue <= 0) {
      return NextResponse.json({ error: "Invalid discount_value" }, { status: 400 });
    }
    if (discountType === "percent" && (discountValue < 1 || discountValue > 100)) {
      return NextResponse.json({ error: "Percent must be 1 to 100" }, { status: 400 });
    }
    insert.discount_value = discountValue;
    insert.partner_moq = null;
    insert.partner_tiers = null;
  } else {
    const partnerMoq = body.partner_moq == null ? 25 : coerceInt(body.partner_moq);
    if (partnerMoq == null || partnerMoq < 1) {
      return NextResponse.json({ error: "Invalid partner_moq" }, { status: 400 });
    }

    const tiers = parsePartnerTiers(body.partner_tiers);
    const tiersErr = validatePartnerTiers(tiers);
    if (tiersErr) return NextResponse.json({ error: tiersErr }, { status: 400 });

    insert.discount_value = null;
    insert.partner_moq = partnerMoq;
    insert.partner_tiers = tiers;

    if (insert.stripe_coupon_id) {
      insert.stripe_coupon_id = null;
    }
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("discount_codes")
      .insert(insert)
      .select(
        "id,code,active,discount_type,discount_value,valid_from,valid_to,max_redemptions,redemption_count,min_subtotal_cents,notes,stripe_coupon_id,partner_moq,partner_tiers,created_at",
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

    const row = {
      ...(data as any),
      partner_tiers: parsePartnerTiers((data as any)?.partner_tiers),
    } as DiscountCodeRow;

    return NextResponse.json({
      ok: true,
      row,
      code: row,
      data: row,
    });
  } catch (e) {
    console.error("discount codes POST error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = assertAdmin(req);
  if (auth) return auth;

  let body: any = null;
  try {
    body = await req.json();
  } catch {}

  const id = getIdFromReq(req, body);
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const update: any = {};

  if (body?.code != null) {
    const code = normalizeCode(body.code);
    if (!code) return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    update.code = code;
  }

  if (body?.active != null) {
    const active = coerceBool(body.active);
    if (active == null) return NextResponse.json({ error: "Invalid active" }, { status: 400 });
    update.active = active;
  }

  if (body?.discount_type != null) {
    if (
      body.discount_type !== "percent" &&
      body.discount_type !== "fixed" &&
      body.discount_type !== "partner_tiered_unit_price"
    ) {
      return NextResponse.json({ error: "Invalid discount_type" }, { status: 400 });
    }
    update.discount_type = body.discount_type;
  }

  if (body?.discount_value !== undefined) {
    if (body.discount_value == null) {
      update.discount_value = null;
    } else {
      const v = coerceInt(body.discount_value);
      if (v == null || v <= 0) {
        return NextResponse.json({ error: "Invalid discount_value" }, { status: 400 });
      }
      update.discount_value = v;
    }
  }

  if (body?.valid_from !== undefined) update.valid_from = coerceIsoOrNull(body.valid_from);
  if (body?.valid_to !== undefined) update.valid_to = coerceIsoOrNull(body.valid_to);

  if (body?.max_redemptions !== undefined) {
    update.max_redemptions = body.max_redemptions == null ? null : coerceInt(body.max_redemptions);
  }

  if (body?.min_subtotal_cents !== undefined) {
    update.min_subtotal_cents =
      body.min_subtotal_cents == null ? null : coerceInt(body.min_subtotal_cents);
  }

  if (body?.notes !== undefined) update.notes = typeof body.notes === "string" ? body.notes : null;

  if (body?.stripe_coupon_id !== undefined) {
    update.stripe_coupon_id = typeof body.stripe_coupon_id === "string" ? body.stripe_coupon_id : null;
  }

  if (body?.partner_moq !== undefined) {
    update.partner_moq = body.partner_moq == null ? null : coerceInt(body.partner_moq);
  }

  if (body?.partner_tiers !== undefined) {
    if (body.partner_tiers == null) {
      update.partner_tiers = null;
    } else {
      const tiers = parsePartnerTiers(body.partner_tiers);
      const tiersErr = validatePartnerTiers(tiers);
      if (tiersErr) return NextResponse.json({ error: tiersErr }, { status: 400 });
      update.partner_tiers = tiers;
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  if (update.discount_type === "percent") {
    if (update.discount_value != null) {
      if (update.discount_value < 1 || update.discount_value > 100) {
        return NextResponse.json({ error: "Percent must be 1 to 100" }, { status: 400 });
      }
    }
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: current, error: currentErr } = await supabase
      .from("discount_codes")
      .select("discount_type")
      .eq("id", id)
      .maybeSingle();

    if (currentErr) {
      return NextResponse.json({ error: currentErr.message }, { status: 400 });
    }

    const finalType = (update.discount_type ?? (current as any)?.discount_type) as DiscountType;

    if (finalType === "percent" || finalType === "fixed") {
      const finalDiscountValue =
        update.discount_value !== undefined ? update.discount_value : undefined;

      if (finalDiscountValue === null) {
        return NextResponse.json(
          { error: "discount_value is required for percent and fixed codes" },
          { status: 400 },
        );
      }

      update.partner_moq = null;
      update.partner_tiers = null;
    } else {
      if (update.discount_value !== undefined && update.discount_value !== null) {
        return NextResponse.json(
          { error: "discount_value must be null for partner tier codes" },
          { status: 400 },
        );
      }

      if (update.discount_value === undefined) {
        update.discount_value = null;
      }

      if (update.partner_moq === undefined) {
        update.partner_moq = 25;
      }

      if (update.partner_tiers === undefined) {
        const { data: tiersRow, error: tiersErr } = await supabase
          .from("discount_codes")
          .select("partner_tiers")
          .eq("id", id)
          .maybeSingle();

        if (tiersErr) return NextResponse.json({ error: tiersErr.message }, { status: 400 });

        const tiers = parsePartnerTiers((tiersRow as any)?.partner_tiers);
        if (tiers.length === 0) {
          return NextResponse.json(
            { error: "partner_tiers is required for partner tier codes" },
            { status: 400 },
          );
        }
      } else {
        if (!update.partner_tiers || parsePartnerTiers(update.partner_tiers).length === 0) {
          return NextResponse.json(
            { error: "partner_tiers is required for partner tier codes" },
            { status: 400 },
          );
        }
      }

      update.stripe_coupon_id = null;
    }

    const { data, error } = await supabase
      .from("discount_codes")
      .update(update)
      .eq("id", id)
      .select(
        "id,code,active,discount_type,discount_value,valid_from,valid_to,max_redemptions,redemption_count,min_subtotal_cents,notes,stripe_coupon_id,partner_moq,partner_tiers,created_at",
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

    const row = {
      ...(data as any),
      partner_tiers: parsePartnerTiers((data as any)?.partner_tiers),
    } as DiscountCodeRow;

    return NextResponse.json({
      ok: true,
      row,
      code: row,
      data: row,
    });
  } catch (e) {
    console.error("discount codes PATCH error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = assertAdmin(req);
  if (auth) return auth;

  let body: any = null;
  try {
    body = await req.json();
  } catch {}

  const id = getIdFromReq(req, body);
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("discount_codes")
      .update({ active: false })
      .eq("id", id)
      .select(
        "id,code,active,discount_type,discount_value,valid_from,valid_to,max_redemptions,redemption_count,min_subtotal_cents,notes,stripe_coupon_id,partner_moq,partner_tiers,created_at",
      )
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const row = {
      ...(data as any),
      partner_tiers: parsePartnerTiers((data as any)?.partner_tiers),
    } as DiscountCodeRow;

    return NextResponse.json({
      ok: true,
      row,
      code: row,
      data: row,
    });
  } catch (e) {
    console.error("discount codes DELETE error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
