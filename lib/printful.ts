// lib/printful.ts

import { createClient } from "@supabase/supabase-js";
import { CARD_TEMPLATES } from "./cardTemplates";

const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;

// New: explicit 4x6 env, falling back to the old generic one for compatibility
const PRINTFUL_SYNC_VARIANT_ID_4X6 =
  process.env.PRINTFUL_SYNC_VARIANT_ID_4X6 ??
  process.env.PRINTFUL_SYNC_VARIANT_ID;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!PRINTFUL_API_KEY || !PRINTFUL_SYNC_VARIANT_ID_4X6) {
  console.warn(
    "[printful] Missing PRINTFUL_API_KEY or PRINTFUL_SYNC_VARIANT_ID_4X6 env vars",
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
  // optional template id so we can pick the correct sync_variant_id
  templateId?: string | null;
};

type CreatePrintfulOrderForCardsArgs = {
  orderId: string | null;
  cards: CardForPrintful[];
};

type CardPrintJobRow = {
  id: string;
  card_id: string;
  pdf_path: string | null;
  printful_order_id: number | null;
  status: string | null;
};

type CardRow = {
  card_id: string;
  print_file_url: string | null;
};

export async function createPrintfulOrderForCards(
  args: CreatePrintfulOrderForCardsArgs,
): Promise<{ printfulOrderId: number; status: string }> {
  if (!PRINTFUL_API_KEY || !PRINTFUL_SYNC_VARIANT_ID_4X6) {
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

  // 1) Fetch card_print_jobs for these cards
  const { data: jobsData, error: jobsError } = await supabaseAdmin
    .from("card_print_jobs")
    .select("id, card_id, pdf_path, printful_order_id, status")
    .in("card_id", cardIds);

  if (jobsError) {
    console.error(
      "[printful] Error fetching card_print_jobs for cards",
      jobsError,
    );
    throw jobsError;
  }

  const jobs = (jobsData ?? []) as CardPrintJobRow[];

  // 2) Fetch card rows to get print_file_url
  const { data: cardsData, error: cardsError } = await supabaseAdmin
    .from("cards")
    .select("card_id, print_file_url")
    .in("card_id", cardIds);

  if (cardsError) {
    console.error(
      "[printful] Error fetching cards for print_file_url",
      cardsError,
    );
    throw cardsError;
  }

  const cardRows = (cardsData ?? []) as CardRow[];

  // Build a map card_id -> print_file_url
  const cardFileMap = new Map<string, string | null>();
  for (const row of cardRows) {
    cardFileMap.set(row.card_id, row.print_file_url ?? null);
  }

  // Map card id -> template id from the args
  const templateIdMap = new Map<string, string | null>();
  for (const c of cards) {
    if (c.templateId) {
      templateIdMap.set(c.cardId, c.templateId);
    }
  }

  // 3) Build Printful items, one per card, using inside2 so it prints on inner right
  const items = jobs.map((job) => {
    const fileUrl = cardFileMap.get(job.card_id) ?? null;

    if (!fileUrl) {
      console.warn(
        "[printful] Missing print_file_url for card",
        job.card_id,
        "job",
        job.id,
      );
    }

    // Choose sync_variant_id based on template id when available
    const templateIdForCard = templateIdMap.get(job.card_id) ?? null;
    let syncVariantId: number;

    if (templateIdForCard) {
      const template = CARD_TEMPLATES.find(
        (t) => t.id === templateIdForCard,
      );
      if (template) {
        syncVariantId = template.printfulSyncVariantId;
      } else {
        console.warn(
          "[printful] No card template found for templateId, falling back to default variant",
          templateIdForCard,
        );
        syncVariantId = Number(PRINTFUL_SYNC_VARIANT_ID_4X6);
      }
    } else {
      syncVariantId = Number(PRINTFUL_SYNC_VARIANT_ID_4X6);
    }

    return {
      sync_variant_id: syncVariantId,
      quantity: 1,
      files: fileUrl
        ? [
            {
              type: "inside2", // inner right panel
              url: fileUrl,
            },
          ]
        : [],
    };
  });

  const validItems = items.filter(
    (it) => Array.isArray(it.files) && it.files.length > 0,
  );

  if (validItems.length === 0) {
    throw new Error("No valid items with file urls to send to Printful");
  }

  // 4) Look up shipping info from orders table
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

  console.info(
    "[printful] Creating Printful order with items:",
    validItems.length,
  );

  // 5) Create Printful order (no custom external_id to avoid errors)
  const response = await fetch("https://api.printful.com/orders", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PRINTFUL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
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

  // 6) Update all related card_print_jobs with this Printful order id and status
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
