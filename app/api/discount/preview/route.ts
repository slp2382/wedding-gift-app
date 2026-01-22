// app/api/discount/preview/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { CARD_TEMPLATES } from "@/lib/cardTemplates";

type CartItemPayload = {
  templateId: string;
  quantity: number;
};

type DiscountType = "percent" | "fixed" | "partner_tiered_unit_price";

type PartnerTier = {
  min_qty: number;
  max_qty: number | null;
  unit_price_cents: number;
};

type DiscountRow = {
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
  partner_moq: number | null;
  partner_tiers: unknown | null;
};

function getSupabaseAdmin(): SupabaseClient | null {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl || !supabaseServiceKey) return null;

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

function normalizeCode(input: string) {
  return input.trim().toUpperCase();
}

function isWithinWindow(row: DiscountRow, now: Date) {
  const from = row.valid_from ? new Date(row.valid_from) : null;
  const to = row.valid_to ? new Date(row.valid_to) : null;
  if (from && now < from) return false;
  if (to && now > to) return false;
  return true;
}

function getCartUnitPriceCents(totalQty: number) {
  if (totalQty >= 5) return 499;
  if (totalQty >= 3) return 549;
  return 599;
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

function findPartnerUnitPriceCents(totalQty: number, tiers: PartnerTier[]): number | null {
  for (const tier of tiers) {
    const withinMin = totalQty >= tier.min_qty;
    const withinMax = tier.max_qty === null ? true : totalQty <= tier.max_qty;
    if (withinMin && withinMax) return tier.unit_price_cents;
  }
  return null;
}

function computeStandardDiscountAmountCents(args: {
  row: DiscountRow;
  productSubtotalCents: number;
}) {
  const { row, productSubtotalCents } = args;

  if (row.discount_type === "percent") {
    const pct = Number(row.discount_value ?? 0);
    const amt = Math.round((productSubtotalCents * pct) / 100);
    return Math.max(0, Math.min(productSubtotalCents, amt));
  }

  const fixed = Number(row.discount_value ?? 0);
  return Math.max(0, Math.min(productSubtotalCents, fixed));
}

function computePartnerTierDiscount(args: {
  row: DiscountRow;
  totalQty: number;
  productSubtotalCents: number;
}) {
  const { row, totalQty, productSubtotalCents } = args;

  const moq = Number(row.partner_moq ?? 25);
  if (!Number.isFinite(moq) || moq <= 0) return { discountAmountCents: 0 };

  if (totalQty < moq) {
    return { discountAmountCents: 0, moq };
  }

  const tiers = parsePartnerTiers(row.partner_tiers);
  const unit = findPartnerUnitPriceCents(totalQty, tiers);
  if (!unit) return { discountAmountCents: 0, moq };

  const partnerSubtotalCents = unit * totalQty;
  const discount = productSubtotalCents - partnerSubtotalCents;

  return {
    discountAmountCents: Math.max(0, Math.min(productSubtotalCents, discount)),
    moq,
    partnerUnitPriceCents: unit,
    partnerSubtotalCents,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { code?: string; items?: CartItemPayload[] }
      | null;

    const rawCode = String(body?.code ?? "").trim();
    if (!rawCode) {
      return NextResponse.json(
        { ok: false, error: "Missing discount code" },
        { status: 400 },
      );
    }

    const items = body?.items;
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Your cart is empty" },
        { status: 400 },
      );
    }

    let totalQty = 0;

    for (const item of items) {
      const template = CARD_TEMPLATES.find((t) => t.id === item.templateId);
      if (!template) {
        return NextResponse.json(
          { ok: false, error: "Unknown product in cart" },
          { status: 400 },
        );
      }

      const qty = Number(item.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        return NextResponse.json(
          { ok: false, error: "Invalid quantity in cart" },
          { status: 400 },
        );
      }

      totalQty += qty;
    }

    const unitPriceCents = getCartUnitPriceCents(totalQty);
    const productSubtotalCents = unitPriceCents * totalQty;

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: "Discounts are not configured" },
        { status: 500 },
      );
    }

    const code = normalizeCode(rawCode);

    const { data, error } = await supabase
      .from("discount_codes")
      .select(
        "id, code, active, discount_type, discount_value, valid_from, valid_to, max_redemptions, redemption_count, min_subtotal_cents, partner_moq, partner_tiers",
      )
      .ilike("code", code)
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: "Failed to look up discount code" },
        { status: 500 },
      );
    }

    const row = data as DiscountRow | null;
    if (!row) {
      return NextResponse.json(
        { ok: false, error: "Invalid discount code" },
        { status: 400 },
      );
    }

    if (!row.active) {
      return NextResponse.json(
        { ok: false, error: "This discount code is not active" },
        { status: 400 },
      );
    }

    const now = new Date();
    if (!isWithinWindow(row, now)) {
      return NextResponse.json(
        { ok: false, error: "This discount code is not currently valid" },
        { status: 400 },
      );
    }

    if (row.max_redemptions !== null && row.redemption_count >= row.max_redemptions) {
      return NextResponse.json(
        { ok: false, error: "This discount code has reached its redemption limit" },
        { status: 400 },
      );
    }

    if (row.min_subtotal_cents !== null && productSubtotalCents < row.min_subtotal_cents) {
      return NextResponse.json(
        { ok: false, error: "Cart subtotal does not meet the minimum for this discount" },
        { status: 400 },
      );
    }

    let discountAmountCents = 0;
    let partnerUnitPriceCents: number | null = null;
    let partnerSubtotalCents: number | null = null;
    let partnerMoq: number | null = null;

    if (row.discount_type === "partner_tiered_unit_price") {
      const computed = computePartnerTierDiscount({
        row,
        totalQty,
        productSubtotalCents,
      });

      if (computed.moq !== undefined) partnerMoq = computed.moq ?? null;
      if (computed.partnerUnitPriceCents !== undefined)
        partnerUnitPriceCents = computed.partnerUnitPriceCents ?? null;
      if (computed.partnerSubtotalCents !== undefined)
        partnerSubtotalCents = computed.partnerSubtotalCents ?? null;

      discountAmountCents = computed.discountAmountCents;

      if (partnerMoq !== null && totalQty < partnerMoq) {
        return NextResponse.json(
          { ok: false, error: `This discount code requires at least ${partnerMoq} cards` },
          { status: 400 },
        );
      }
    } else {
      discountAmountCents = computeStandardDiscountAmountCents({
        row,
        productSubtotalCents,
      });
    }

    if (discountAmountCents <= 0) {
      return NextResponse.json(
        { ok: false, error: "This discount code does not apply to this cart" },
        { status: 400 },
      );
    }

    const productSubtotalAfterDiscountCents = Math.max(
      0,
      productSubtotalCents - discountAmountCents,
    );

    return NextResponse.json(
      {
        ok: true,
        code,
        discountType: row.discount_type,
        discountValue: row.discount_value,
        discountAmountCents,
        productSubtotalCents,
        productSubtotalAfterDiscountCents,
        totalQty,
        unitPriceCents,
        partnerMoq,
        partnerUnitPriceCents,
        partnerSubtotalCents,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[discount/preview] Error", err);
    return NextResponse.json(
      { ok: false, error: "Failed to validate discount code" },
      { status: 500 },
    );
  }
}
