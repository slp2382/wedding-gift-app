import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { CARD_TEMPLATES } from "@/lib/cardTemplates";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

type CartItemPayload = {
  templateId: string;
  quantity: number;
};

type DiscountRow = {
  id: string;
  code: string;
  active: boolean;
  discount_type: "percent" | "fixed";
  discount_value: number;
  valid_from: string | null;
  valid_to: string | null;
  max_redemptions: number | null;
  redemption_count: number;
  min_subtotal_cents: number | null;
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

async function buildLineItemsFromCart(
  cartItems: CartItemPayload[],
): Promise<Array<{ priceId: string; quantity: number }>> {
  const out: Array<{ priceId: string; quantity: number }> = [];

  for (const item of cartItems) {
    const template = CARD_TEMPLATES.find((t) => t.id === item.templateId);
    if (!template) {
      throw new Error("Unknown product in cart");
    }

    const rawQuantity = Number(item.quantity);
    if (!Number.isFinite(rawQuantity) || rawQuantity <= 0) {
      throw new Error("Invalid quantity in cart");
    }

    const stripePrices = (template as any).stripePrices as
      | Record<number, string>
      | undefined;

    if (!stripePrices) {
      throw new Error("Pricing not configured for this product");
    }

    let remaining = rawQuantity;
    const packSizes = [5, 3, 1];

    for (const packSize of packSizes) {
      const priceId = stripePrices[packSize];
      if (!priceId) continue;

      while (remaining >= packSize) {
        out.push({ priceId, quantity: 1 });
        remaining -= packSize;
      }
    }

    if (remaining > 0) {
      throw new Error("Unsupported quantity in cart");
    }
  }

  return out;
}

async function computeProductSubtotalCents(
  stripeClient: Stripe,
  lineItems: Array<{ priceId: string; quantity: number }>,
) {
  const counts = new Map<string, number>();
  for (const li of lineItems) {
    counts.set(li.priceId, (counts.get(li.priceId) ?? 0) + li.quantity);
  }

  let subtotal = 0;

  for (const [priceId, qty] of counts.entries()) {
    const price = await stripeClient.prices.retrieve(priceId);
    const unit = price.unit_amount ?? null;
    if (unit === null) {
      throw new Error("One or more prices are missing unit_amount");
    }
    subtotal += unit * qty;
  }

  return subtotal;
}

function computeDiscountAmountCents(args: {
  row: DiscountRow;
  productSubtotalCents: number;
}) {
  const { row, productSubtotalCents } = args;

  if (row.discount_type === "percent") {
    const pct = Number(row.discount_value);
    const amt = Math.round((productSubtotalCents * pct) / 100);
    return Math.max(0, Math.min(productSubtotalCents, amt));
  }

  // fixed
  // Assumption: discount_value is stored in cents for fixed discounts
  const fixed = Number(row.discount_value);
  return Math.max(0, Math.min(productSubtotalCents, fixed));
}

export async function POST(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ ok: false, error: "Stripe is not configured" }, { status: 500 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: "Supabase admin is not configured" }, { status: 500 });
    }

    const body = (await req.json().catch(() => null)) as
      | { items?: CartItemPayload[]; code?: string }
      | null;

    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ ok: false, error: "Your cart is empty" }, { status: 400 });
    }

    const rawCode = String(body.code ?? "").trim();
    if (!rawCode) {
      return NextResponse.json({ ok: false, error: "Discount code is required" }, { status: 400 });
    }

    const code = normalizeCode(rawCode);

    const lineItems = await buildLineItemsFromCart(body.items);
    const productSubtotalCents = await computeProductSubtotalCents(stripe, lineItems);

    const { data, error } = await supabase
      .from("discount_codes")
      .select(
        "id, code, active, discount_type, discount_value, valid_from, valid_to, max_redemptions, redemption_count, min_subtotal_cents",
      )
      .ilike("code", code)
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: "Failed to look up discount code" }, { status: 500 });
    }

    const row = data as DiscountRow | null;
    if (!row) {
      return NextResponse.json({ ok: false, error: "Invalid discount code" }, { status: 400 });
    }

    if (!row.active) {
      return NextResponse.json({ ok: false, error: "This discount code is not active" }, { status: 400 });
    }

    const now = new Date();
    if (!isWithinWindow(row, now)) {
      return NextResponse.json({ ok: false, error: "This discount code is not currently valid" }, { status: 400 });
    }

    if (row.max_redemptions !== null && row.redemption_count >= row.max_redemptions) {
      return NextResponse.json({ ok: false, error: "This discount code has reached its redemption limit" }, { status: 400 });
    }

    if (row.min_subtotal_cents !== null && productSubtotalCents < row.min_subtotal_cents) {
      return NextResponse.json({ ok: false, error: "Cart subtotal does not meet the minimum for this discount" }, { status: 400 });
    }

    const discountAmountCents = computeDiscountAmountCents({ row, productSubtotalCents });
    if (discountAmountCents <= 0) {
      return NextResponse.json({ ok: false, error: "This discount code does not apply to this cart" }, { status: 400 });
    }

    return NextResponse.json(
      {
        ok: true,
        code,
        discountType: row.discount_type,
        discountValue: row.discount_value,
        discountAmountCents,
        productSubtotalCents,
        productSubtotalAfterDiscountCents: Math.max(0, productSubtotalCents - discountAmountCents),
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("[discount/preview] Error", err);
    return NextResponse.json(
      { ok: false, error: "Failed to validate discount code" },
      { status: 500 },
    );
  }
}
