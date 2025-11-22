// lib/printful.ts

import { createClient } from "@supabase/supabase-js";

const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
const PRINTFUL_SYNC_VARIANT_ID = process.env.PRINTFUL_SYNC_VARIANT_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!PRINTFUL_API_KEY || !PRINTFUL_SYNC_VARIANT_ID) {
  console.warn(
    "[printful] Missing PRINTFUL_API_KEY or PRINTFUL_SYNC_VARIANT_ID env vars",
  );
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("[printful] Missing Supabase env vars in printful lib");
}

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
    : null;

type CardForPrintful = {
  cardId: string;
  storagePath: string | null;
};

type CreatePrintfulOrderForCardsArgs = {
  orderId: string | null;
  cards: CardForPrintful[];
};

type CardPrintJobRow = {
  id: string;
  card_id: string;
  pdf_path: string | null;
};

export async function createPrintfulOrderForCards(
  args: CreatePrintfulOrderForCardsArgs,
): Promise<{ printfulOrderId: number; status: string }> {
  if (!PRINTFUL_API_KEY || !PRINTFUL_SYNC_VARIANT_ID) {
    throw new Error("Printful env vars missing");
  }
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client not available in printful lib");
  }

  const { orderId, cards } = args;

  if (!orderId) {
    throw new Error("orderId is required to create Printful order");
  }
  if (!cards || cards.length === 0) {
    throw new Error("No cards provided for Printful order");
  }

  const cardIds = cards.map((c) => c.cardId);

  // Fetch card_print_jobs for these cards
  const { data: jobs, error: jobsError } = await supabaseAdmin
    .from("card_print_jobs")
    .select("id, card_id, pdf_path")
    .in("card_id", cardIds);

  if (jobsError) {
    console.error(
      "[printful] Error fetching card_print_jobs for cards",
      jobsError,
    );
    throw jobsError;
  }

  const typedJobs: CardPrintJobRow[] = (jobs || []) as CardPrintJobRow[];

  // Build Printful items: one item per card using pdf_path to construct file url
  const items = typedJobs.map((job) => {
    const fileUrl = job.pdf_path
      ? `${SUPABASE_URL}/storage/v1/object/public/printfiles/${job.pdf_path}`
      : null;

    if (!fileUrl) {
      console.warn(
        "[printful] Missing pdf_path for card",
        job.card_id,
        "job",
        job.id,
      );
    }

    return {
      sync_variant_id: Number(PRINTFUL_SYNC_VARIANT_ID),
      quantity: 1,
      files: fileUrl
        ? [
            {
              type: "default",
              url: fileUrl,
            },
          ]
        : [],
    };
  });

  const validItems = items.filter((it) => it.files && it.files.length > 0);

  if (validItems.length === 0) {
    throw new Error("No valid items with file urls to send to Printful");
  }

  // Look up shipping info from orders table
  const { data: orderRow, error: orderError } = await supabaseAdmin
    .from("orders")
    .select(
      "shipping_name, shipping_address_line1, shipping_address_line2, shipping_city, shipping_state, shipping_postal_code, shipping_country",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    console.error("[printful] Error fetching order for shipping", orderError);
    throw orderError;
  }

  const recipient = orderRow
    ? {
        name: orderRow.shipping_name ?? "",
        address1: orderRow.shipping_address_line1 ?? "",
        address2: orderRow.shipping_address_line2 ?? "",
        city: orderRow.shipping_city ?? "",
        state_code: orderRow.shipping_state ?? "",
        country_code: orderRow.shipping_country ?? "",
        zip: orderRow.shipping_postal_code ?? "",
      }
    : null;

  if (!recipient) {
    throw new Error(
      "Missing shipping data on order; cannot create Printful order",
    );
  }

  // Single Printful order with all cards as items
  const externalId = `giftlink_${orderId}`;

  console.log(
    "[printful] Creating Printful order with external_id",
    externalId,
    "items:",
    validItems.length,
  );

  const response = await fetch("https://api.printful.com/orders", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PRINTFUL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      external_id: externalId,
      recipient,
      items: validItems,
      confirm: false, // send as draft
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      "[printful] Printful API error",
      response.status,
      response.statusText,
      errorText,
    );
    throw new Error(
      `Printful API error ${response.status} ${response.statusText}`,
    );
  }

  const json = await response.json();

  const printfulOrderId = json?.result?.id;
  const status = json?.result?.status ?? "draft";

  // Update all related card_print_jobs with this Printful order id and status
  const { error: updateError } = await supabaseAdmin
    .from("card_print_jobs")
    .update({
      printful_order_id: printfulOrderId,
      printful_status: status,
    })
    .in("card_id", cardIds);

  if (updateError) {
    console.error(
      "[printful] Error updating card_print_jobs with Printful order id",
      updateError,
    );
  }

  return {
    printfulOrderId,
    status,
  };
}
