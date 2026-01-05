// app/api/shop/checkout/route.ts

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { CARD_TEMPLATES } from "@/lib/cardTemplates";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;

// Stripe metadata value limit is tight, so we keep a little headroom
const METADATA_VALUE_SAFE_LIMIT = 450;

type CartItemPayload = {
  templateId: string;
  quantity: number;
};

type RecipientPayload = {
  name: string;
  address1: string;
  city: string;
  stateCode: string;
  countryCode: string;
  zip: string;
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
  stripe_coupon_id: string | null;
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

function maskSecret(v: string | null | undefined): string | null {
  if (!v) return null;
  if (v.length <= 8) return "********";
  return `${v.slice(0, 8)}...${v.slice(-4)}`;
}

function buildItemsMetadata(
  metadataItems: Array<{ templateId: string; size: string; quantity: number }>,
): Record<string, string> {
  const out: Record<string, string> = {};

  const full = JSON.stringify(metadataItems);
  if (full.length <= METADATA_VALUE_SAFE_LIMIT) {
    out.items = full;
    return out;
  }

  const chunks: Array<
    Array<{ templateId: string; size: string; quantity: number }>
  > = [];

  let current: Array<{ templateId: string; size: string; quantity: number }> = [];

  for (const item of metadataItems) {
    const candidate = [...current, item];
    const candidateStr = JSON.stringify(candidate);

    if (candidateStr.length <= METADATA_VALUE_SAFE_LIMIT) {
      current = candidate;
      continue;
    }

    if (current.length === 0) {
      chunks.push([item]);
      current = [];
      continue;
    }

    chunks.push(current);
    current = [item];
  }

  if (current.length) chunks.push(current);

  out.itemsChunkCount = String(chunks.length);
  chunks.forEach((chunk, idx) => {
    out[`items_${idx}`] = JSON.stringify(chunk);
  });

  return out;
}

function isStripeLikeError(err: any) {
  return (
    err &&
    typeof err === "object" &&
    (typeof err.type === "string" || typeof err.code === "string")
  );
}

function isWithinWindow(row: DiscountRow, now: Date) {
  const from = row.valid_from ? new Date(row.valid_from) : null;
  const to = row.valid_to ? new Date(row.valid_to) : null;
  if (from && now < from) return false;
  if (to && now > to) return false;
  return true;
}

async function computeProductSubtotalCents(
  stripeClient: Stripe,
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[],
) {
  const counts = new Map<string, number>();

  for (const li of lineItems) {
    const priceId = (li as any).price as string | undefined;
    const qty = Number((li as any).quantity ?? 0);
    if (!priceId || !Number.isFinite(qty) || qty <= 0) continue;
    counts.set(priceId, (counts.get(priceId) ?? 0) + qty);
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
  const debugEnabled =
    req.headers.get("x-giftlink-debug") === "1" ||
    req.nextUrl.searchParams.get("debug") === "1";

  const debug: Record<string, any> = {
    debugEnabled,
    env: {
      STRIPE_SECRET_KEY: maskSecret(process.env.STRIPE_SECRET_KEY ?? null),
      STRIPE_SHOP_CARD_PRICE_ID: process.env.STRIPE_SHOP_CARD_PRICE_ID ?? null,
      STRIPE_SHOP_SHIPPING_PRICE_ID:
        process.env.STRIPE_SHOP_SHIPPING_PRICE_ID ?? null,
      PRINTFUL_API_KEY: maskSecret(process.env.PRINTFUL_API_KEY ?? null),
      VERCEL_ENV: process.env.VERCEL_ENV ?? null,
      GIFTLINK_BASE_URL: process.env.GIFTLINK_BASE_URL ?? null,
      SUPABASE_URL: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
      SUPABASE_SERVICE_ROLE_KEY: maskSecret(process.env.SUPABASE_SERVICE_ROLE_KEY ?? null),
    },
    request: {
      originHeader: req.headers.get("origin"),
      url: req.nextUrl.toString(),
    },
    computed: {},
  };

  try {
    if (!stripe) {
      console.error("[shop/checkout] Missing STRIPE_SECRET_KEY");
      return NextResponse.json(
        {
          error: "Stripe is not configured",
          ...(debugEnabled ? { debug } : {}),
        },
        { status: 500 },
      );
    }

    if (!PRINTFUL_API_KEY) {
      console.error("[shop/checkout] Missing PRINTFUL_API_KEY");
      return NextResponse.json(
        {
          error: "Shipping is not configured",
          ...(debugEnabled ? { debug } : {}),
        },
        { status: 500 },
      );
    }

    const originHeader = req.headers.get("origin");
    const origin =
      originHeader ||
      process.env.GIFTLINK_BASE_URL ||
      "https://www.giftlink.cards";

    const body = (await req.json().catch(() => null)) as
      | { items?: CartItemPayload[]; recipient?: RecipientPayload; discountCode?: string | null }
      | null;

    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      console.error("[shop/checkout] Missing or empty items in request body");
      return NextResponse.json(
        {
          error: "Your cart is empty",
          ...(debugEnabled ? { debug } : {}),
        },
        { status: 400 },
      );
    }

    if (!body.recipient) {
      console.error("[shop/checkout] Missing recipient in request body");
      return NextResponse.json(
        {
          error: "Shipping address is required",
          ...(debugEnabled ? { debug } : {}),
        },
        { status: 400 },
      );
    }

    const cartItems = body.items;
    const recipient = body.recipient;

    debug.computed.origin = origin;
    debug.computed.cartItems = cartItems.map((i) => ({
      templateId: i.templateId,
      quantity: i.quantity,
    }));
    debug.computed.recipientSummary = {
      countryCode: recipient.countryCode,
      stateCode: recipient.stateCode,
      zip: recipient.zip,
    };

    // Build Stripe line items from cart using pack based pricing (1, 3, 5)
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const metadataItems: Array<{
      templateId: string;
      size: string;
      quantity: number;
    }> = [];

    const priceIdsUsed: string[] = [];

    for (const item of cartItems) {
      const template = CARD_TEMPLATES.find((t) => t.id === item.templateId);

      if (!template) {
        console.error(
          "[shop/checkout] Unknown templateId in cart",
          item.templateId,
        );
        return NextResponse.json(
          {
            error: "Unknown product in cart",
            ...(debugEnabled ? { debug } : {}),
          },
          { status: 400 },
        );
      }

      const rawQuantity = Number(item.quantity);
      if (!Number.isFinite(rawQuantity) || rawQuantity <= 0) {
        console.error("[shop/checkout] Invalid quantity in cart", item.quantity);
        return NextResponse.json(
          {
            error: "Invalid quantity in cart",
            ...(debugEnabled ? { debug } : {}),
          },
          { status: 400 },
        );
      }

      const stripePrices = (template as any).stripePrices as
        | Record<number, string>
        | undefined;

      if (!stripePrices) {
        console.error(
          "[shop/checkout] Missing stripePrices for template",
          (template as any).id ?? template,
        );
        return NextResponse.json(
          {
            error: "Pricing not configured for this product",
            ...(debugEnabled ? { debug } : {}),
          },
          { status: 500 },
        );
      }

      // Decompose the quantity into packs of 5, 3, and 1
      let remaining = rawQuantity;
      const packSizes = [5, 3, 1];

      for (const packSize of packSizes) {
        const priceId = stripePrices[packSize];
        if (!priceId) continue;

        while (remaining >= packSize) {
          lineItems.push({ price: priceId, quantity: 1 });
          priceIdsUsed.push(priceId);

          metadataItems.push({
            templateId: (template as any).id ?? "",
            size: (template as any).size ?? "",
            quantity: packSize,
          });

          remaining -= packSize;
        }
      }

      if (remaining > 0) {
        console.error(
          "[shop/checkout] Could not decompose quantity into supported packs",
          rawQuantity,
          "remaining",
          remaining,
        );
        return NextResponse.json(
          {
            error: "Unsupported quantity in cart",
            ...(debugEnabled ? { debug } : {}),
          },
          { status: 400 },
        );
      }
    }

    if (lineItems.length === 0) {
      console.error("[shop/checkout] No valid line items after processing cart");
      return NextResponse.json(
        {
          error: "No valid items in cart",
          ...(debugEnabled ? { debug } : {}),
        },
        { status: 400 },
      );
    }

    debug.computed.lineItems = lineItems.map((li) => ({
      price: (li as any).price ?? null,
      quantity: (li as any).quantity ?? null,
    }));
    debug.computed.metadataItems = metadataItems;
    debug.computed.priceIdsUsed = Array.from(new Set(priceIdsUsed));

    const totalCards = metadataItems.reduce((sum, item) => sum + item.quantity, 0);
    const itemsMetadata = buildItemsMetadata(metadataItems);

    // Compute product subtotal cents for discount validation and metadata
    let productSubtotalCents = 0;
    try {
      productSubtotalCents = await computeProductSubtotalCents(stripe, lineItems);
      debug.computed.productSubtotalCents = productSubtotalCents;
    } catch (e: any) {
      console.error("[shop/checkout] Failed to compute product subtotal", e);
      debug.computed.productSubtotalError = String(e?.message ?? e);
    }

    // Compute Printful shipping again on the server to avoid trusting the client
    const variantQuantity = new Map<number, number>();

    for (const item of cartItems) {
      const template = CARD_TEMPLATES.find((t) => t.id === item.templateId);
      if (!template) {
        console.error(
          "[shop/checkout] Unknown template when mapping shipping",
          item.templateId,
        );
        continue;
      }

      const shippingVariant =
        (template as any).printfulShippingVariantId ??
        (template as any).printfulCatalogVariantId;

      if (!shippingVariant) {
        console.error(
          "[shop/checkout] Missing Printful shipping variant for template",
          item.templateId,
        );
        continue;
      }

      const variantId = Number(shippingVariant);
      if (!Number.isFinite(variantId)) {
        console.error(
          "[shop/checkout] Invalid Printful shipping variant id for template",
          item.templateId,
          shippingVariant,
        );
        continue;
      }

      const prev = variantQuantity.get(variantId) ?? 0;
      variantQuantity.set(variantId, prev + Number(item.quantity ?? 0));
    }

    if (!variantQuantity.size) {
      console.error(
        "[shop/checkout] Could not map any items to Printful variants for shipping",
      );
      return NextResponse.json(
        {
          error: "Could not calculate shipping for this cart",
          ...(debugEnabled ? { debug } : {}),
        },
        { status: 400 },
      );
    }

    const itemsForPrintful = Array.from(variantQuantity.entries()).map(
      ([variant_id, quantity]) => ({
        variant_id,
        quantity,
      }),
    );

    debug.computed.printfulShippingItems = itemsForPrintful;

    const shippingBody = {
      recipient: {
        name: recipient.name,
        address1: recipient.address1,
        city: recipient.city,
        state_code: recipient.stateCode,
        country_code: recipient.countryCode || "US",
        zip: recipient.zip,
      },
      items: itemsForPrintful,
      currency: "USD",
    };

    const shippingRes = await fetch("https://api.printful.com/shipping/rates", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PRINTFUL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(shippingBody),
    });

    if (!shippingRes.ok) {
      const text = await shippingRes.text().catch(() => "");
      console.error(
        "[shop/checkout] Printful shipping error",
        shippingRes.status,
        text,
      );
      debug.computed.printfulShippingError = {
        status: shippingRes.status,
        body: text.slice(0, 2000),
      };
      return NextResponse.json(
        {
          error: "Failed to calculate shipping",
          ...(debugEnabled ? { debug } : {}),
        },
        { status: 500 },
      );
    }

    const shippingJson = (await shippingRes.json()) as {
      code: number;
      result: Array<{
        id: string;
        name: string;
        rate: string;
        currency: string;
      }>;
    };

    if (!shippingJson.result || shippingJson.result.length === 0) {
      console.error("[shop/checkout] No shipping methods returned from Printful");
      return NextResponse.json(
        {
          error: "No shipping methods available",
          ...(debugEnabled ? { debug } : {}),
        },
        { status: 400 },
      );
    }

    const best = shippingJson.result[0];
    const printfulRate = parseFloat(best.rate);
    if (!Number.isFinite(printfulRate)) {
      console.error("[shop/checkout] Invalid Printful rate value", best.rate);
      return NextResponse.json(
        {
          error: "Invalid shipping rate received",
          ...(debugEnabled ? { debug } : {}),
        },
        { status: 500 },
      );
    }

    const printfulRateCents = Math.round(printfulRate * 100);
    const handlingCents = 50;
    const totalShippingCents = printfulRateCents + handlingCents;

    debug.computed.shipping = {
      methodId: best.id,
      methodName: best.name,
      printfulRateCents,
      handlingCents,
      totalShippingCents,
      currency: best.currency,
    };
    debug.computed.totalCards = totalCards;

    // Optional discount code handling
    const rawDiscountInput = String(body.discountCode ?? "").trim();
    let discountsParam: Stripe.Checkout.SessionCreateParams["discounts"] | undefined = undefined;

    const discountMetadata: Record<string, string> = {};

    if (rawDiscountInput) {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        return NextResponse.json(
          { error: "Discounts are not configured", ...(debugEnabled ? { debug } : {}) },
          { status: 500 },
        );
      }

      const code = normalizeCode(rawDiscountInput);

      const { data, error } = await supabase
        .from("discount_codes")
        .select(
          "id, code, active, discount_type, discount_value, valid_from, valid_to, max_redemptions, redemption_count, min_subtotal_cents, stripe_coupon_id",
        )
        .ilike("code", code)
        .limit(1)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { error: "Failed to look up discount code", ...(debugEnabled ? { debug } : {}) },
          { status: 500 },
        );
      }

      const row = data as DiscountRow | null;
      if (!row) {
        return NextResponse.json(
          { error: "Invalid discount code", ...(debugEnabled ? { debug } : {}) },
          { status: 400 },
        );
      }

      if (!row.active) {
        return NextResponse.json(
          { error: "This discount code is not active", ...(debugEnabled ? { debug } : {}) },
          { status: 400 },
        );
      }

      const now = new Date();
      if (!isWithinWindow(row, now)) {
        return NextResponse.json(
          { error: "This discount code is not currently valid", ...(debugEnabled ? { debug } : {}) },
          { status: 400 },
        );
      }

      if (row.max_redemptions !== null && row.redemption_count >= row.max_redemptions) {
        return NextResponse.json(
          { error: "This discount code has reached its redemption limit", ...(debugEnabled ? { debug } : {}) },
          { status: 400 },
        );
      }

      if (row.min_subtotal_cents !== null && productSubtotalCents < row.min_subtotal_cents) {
        return NextResponse.json(
          { error: "Cart subtotal does not meet the minimum for this discount", ...(debugEnabled ? { debug } : {}) },
          { status: 400 },
        );
      }

      const discountAmountCents = computeDiscountAmountCents({
        row,
        productSubtotalCents,
      });

      if (discountAmountCents <= 0) {
        return NextResponse.json(
          { error: "This discount code does not apply to this cart", ...(debugEnabled ? { debug } : {}) },
          { status: 400 },
        );
      }

      let couponId = row.stripe_coupon_id ?? null;

      if (!couponId) {
        // Create a Stripe coupon once and store it back onto the row
        const created = await stripe.coupons.create(
          row.discount_type === "percent"
            ? {
                duration: "once",
                percent_off: row.discount_value,
                name: `GiftLink ${code}`,
              }
            : {
                duration: "once",
                amount_off: row.discount_value,
                currency: "usd",
                name: `GiftLink ${code}`,
              },
        );

        couponId = created.id;

        // Best effort update, no hard failure if it cannot update
        try {
          await supabase
            .from("discount_codes")
            .update({ stripe_coupon_id: couponId })
            .eq("id", row.id);
        } catch (e) {
          console.warn("[shop/checkout] Failed to persist stripe_coupon_id", e);
        }
      }

      discountsParam = [{ coupon: couponId }];

      discountMetadata.discount_code = code;
      discountMetadata.discount_code_id = row.id;
      discountMetadata.discount_type = row.discount_type;
      discountMetadata.discount_value = String(row.discount_value);
      discountMetadata.discount_amount_cents = String(discountAmountCents);
      discountMetadata.product_subtotal_cents = String(productSubtotalCents);
      discountMetadata.product_subtotal_after_discount_cents = String(
        Math.max(0, productSubtotalCents - discountAmountCents),
      );

      debug.computed.discount = {
        code,
        rowId: row.id,
        type: row.discount_type,
        value: row.discount_value,
        discountAmountCents,
        couponId,
      };
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      discounts: discountsParam,
      success_url: `${origin}/shop?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/shop?status=cancelled`,
      metadata: {
        type: "card_pack_order",
        packQuantity: String(totalCards),

        ...itemsMetadata,

        // Discount metadata (if present)
        ...discountMetadata,

        // Additional shipping metadata for webhook and admin use
        shipping_printful_method_id: best.id,
        shipping_printful_method_name: best.name,
        shipping_printful_rate_cents: String(printfulRateCents),
        shipping_handling_cents: String(handlingCents),
        shipping_total_cents: String(totalShippingCents),
        shipping_country: recipient.countryCode,
        shipping_state: recipient.stateCode,
        shipping_zip: recipient.zip,
      },
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            display_name: "Shipping and handling",
            type: "fixed_amount",
            fixed_amount: {
              amount: totalShippingCents,
              currency: "usd",
            },
          },
        },
      ],
    });

    debug.computed.session = {
      id: session.id,
      url: session.url,
      livemode: session.livemode,
    };

    return NextResponse.json(
      { url: session.url, ...(debugEnabled ? { debug } : {}) },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Error creating shop checkout session", err);

    const stripeErr = isStripeLikeError(err)
      ? {
          type: err.type,
          code: err.code,
          param: err.param,
          message: err.message,
          requestId: err.requestId,
          statusCode: err.statusCode,
        }
      : null;

    if (stripeErr) {
      debug.computed.stripeError = stripeErr;
    } else {
      debug.computed.error = { message: String(err?.message ?? err) };
    }

    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        ...(debugEnabled ? { debug } : {}),
      },
      { status: 500 },
    );
  }
}
