// app/api/env-debug/route.ts

import { NextResponse } from "next/server";

function summarize(value: string | undefined) {
  return value ? `present (length ${value.length})` : "missing";
}

export async function GET() {
  return NextResponse.json({
    // Printful
    PRINTFUL_API_KEY: summarize(process.env.PRINTFUL_API_KEY),
    PRINTFUL_SYNC_VARIANT_ID: summarize(process.env.PRINTFUL_SYNC_VARIANT_ID),

    // Supabase
    SUPABASE_URL: summarize(process.env.SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY: summarize(
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    NEXT_PUBLIC_SUPABASE_URL: summarize(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: summarize(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),

    // Stripe
    STRIPE_SECRET_KEY: summarize(process.env.STRIPE_SECRET_KEY),
    STRIPE_WEBHOOK_SECRET: summarize(process.env.STRIPE_WEBHOOK_SECRET),

    // GiftLink base url
    GIFTLINK_BASE_URL: summarize(process.env.GIFTLINK_BASE_URL),

    // Shop / pricing
    STRIPE_SHOP_SHIPPING_PRICE_ID: summarize(
      process.env.STRIPE_SHOP_SHIPPING_PRICE_ID,
    ),
    PRICE_4X6_QTY_1: summarize(process.env.PRICE_4X6_QTY_1),
    PRICE_4X6_QTY_3: summarize(process.env.PRICE_4X6_QTY_3),
    PRICE_4X6_QTY_5: summarize(process.env.PRICE_4X6_QTY_5),
    PRICE_5X7_QTY_1: summarize(process.env.PRICE_5X7_QTY_1),
    PRICE_5X7_QTY_3: summarize(process.env.PRICE_5X7_QTY_3),
    PRICE_5X7_QTY_5: summarize(process.env.PRICE_5X7_QTY_5),
  });
}
