// lib/printful.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY!;
const PRINTFUL_SYNC_VARIANT_ID = Number(
  process.env.PRINTFUL_SYNC_VARIANT_ID,
); // 5064628437

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase server env vars missing");
}
if (!PRINTFUL_API_KEY) {
  throw new Error("PRINTFUL_API_KEY missing");
}
if (!PRINTFUL_SYNC_VARIANT_ID || Number.isNaN(PRINTFUL_SYNC_VARIANT_ID)) {
  throw new Error("PRINTFUL_SYNC_VARIANT_ID missing or invalid");
}

// Supabase admin client – server side only
const supabaseAdmin: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  },
);

/**
 * Build a public URL to a file in the "printfiles" bucket
 * given a relative path like "cards/card_abc123.png".
 */
function buildPrintfilePublicUrl(relativePath: string): string {
  const base = SUPABASE_URL.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/printfiles/${relativePath}`;
}

type GiftlinkPrintfulOrderResult = {
  printfulOrderId: number;
  status: string;
  raw: any;
};

/**
 * Create a Printful order for a single GiftLink card.
 *
 * Uses:
 *  - card_print_jobs: to find print file path (stored in pdf_path) + order_id for cardId
 *  - orders: to load shipping + email from order_id
 *  - PRINTFUL_SYNC_VARIANT_ID: your "Wedding Card 1" listing
 *  - pdf_path: inside-right print asset (now a PNG), attached as type "inside2"
 */
export async function createPrintfulOrderForCard(
  cardId: string,
): Promise<GiftlinkPrintfulOrderResult> {
  // 1) Find most recent print job for this card
  const { data: job, error: jobError } = await supabaseAdmin
    .from("card_print_jobs")
    .select("id, card_id, order_id, status, pdf_path")
    .eq("card_id", cardId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (jobError || !job) {
    console.error("No card_print_job found for card", cardId, jobError);
    throw new Error("No card_print_job found for card " + cardId);
  }

  if (!job.order_id) {
    throw new Error(
      `card_print_jobs row for ${cardId} has no order_id; link it to orders.id first`,
    );
  }

  if (!job.pdf_path) {
    throw new Error(
      `card_print_jobs row for ${cardId} has no print file path (pdf_path); cannot create Printful order`,
    );
  }

  // 2) Load the related order for shipping + email
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select(
      `
      id,
      email,
      shipping_name,
      shipping_address_line1,
      shipping_address_line2,
      shipping_city,
      shipping_state,
      shipping_postal_code,
      shipping_country
    `,
    )
    .eq("id", job.order_id)
    .single();

  if (orderError || !order) {
    console.error("Order not found for print job", job.order_id, orderError);
    throw new Error("Order not found for print job " + job.order_id);
  }

  // 3) Public URL for inside-right print asset (now PNG)
  const insideRightUrl = buildPrintfilePublicUrl(job.pdf_path);

  // 4) Build Printful order payload
  const payload = {
    external_id: `giftlink_${cardId}`,
    shipping: "STANDARD",
    confirm: false, // keep false to ensure orders don't autofill. Change to true when ready to auto-fulfill.
    recipient: {
      name: order.shipping_name,
      address1: order.shipping_address_line1,
      address2: order.shipping_address_line2,
      city: order.shipping_city,
      state_code: order.shipping_state,
      country_code: order.shipping_country,
      zip: order.shipping_postal_code,
      email: order.email,
    },
    items: [
      {
        // Use your existing store listing: "Wedding Card 1"
        sync_variant_id: PRINTFUL_SYNC_VARIANT_ID,
        quantity: 1,
        // Attach just the inside QR panel; front/back stay as designed in Printful
        files: [
          {
            // For 4×6 Greeting Card the inside panel is usually "inside2"
            type: "inside2",
            url: insideRightUrl,
          },
        ],
      },
    ],
  };

  // 5) Call Printful API
  const res = await fetch("https://api.printful.com/orders", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PRINTFUL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("Printful order create failed", {
      status: res.status,
      body,
    });
    throw new Error(
      `Printful order creation failed: ${res.status} ${JSON.stringify(body)}`,
    );
  }

  const result = body?.result ?? body;
  const printfulOrderId = result?.id;
  const status = result?.status ?? "unknown";

  // 6) Update card_print_jobs with Printful tracking info (if columns exist)
  try {
    await supabaseAdmin
      .from("card_print_jobs")
      .update({
        printful_order_id: printfulOrderId,
        printful_status: status,
      })
      .eq("id", job.id);
  } catch (err) {
    console.error("Failed to update card_print_jobs with Printful info", err);
  }

  return {
    printfulOrderId,
    status,
    raw: body,
  };
}
