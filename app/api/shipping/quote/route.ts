import { NextRequest, NextResponse } from "next/server";
import { CARD_TEMPLATES } from "@/lib/cardTemplates";

const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;

type CartItemPayload = {
  templateId: string;
  quantity: number;
};

type Recipient = {
  name: string;
  address1: string;
  city: string;
  stateCode: string;
  countryCode: string;
  zip: string;
};

export async function POST(req: NextRequest) {
  if (!PRINTFUL_API_KEY) {
    console.error("[shipping/quote] Missing PRINTFUL_API_KEY");
    return NextResponse.json(
      { ok: false, error: "Shipping is not configured." },
      { status: 500 },
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { items?: CartItemPayload[]; recipient?: Recipient }
    | null;

  if (!body || !Array.isArray(body.items) || !body.recipient) {
    return NextResponse.json(
      { ok: false, error: "Missing items or recipient." },
      { status: 400 },
    );
  }

  const { items, recipient } = body;

  if (!items.length) {
    return NextResponse.json(
      { ok: false, error: "Cart is empty." },
      { status: 400 },
    );
  }

  // Map cart to Printful variant ids and aggregate quantities
  const variantQuantity = new Map<number, number>();

  for (const item of items) {
    const template = CARD_TEMPLATES.find((t) => t.id === item.templateId);
    if (!template || !("printfulSyncVariantId" in template)) {
      console.error(
        "[shipping/quote] Missing Printful variant for template",
        item.templateId,
      );
      continue;
    }

    const variantId = (template as any).printfulSyncVariantId as number;
    const prev = variantQuantity.get(variantId) ?? 0;
    variantQuantity.set(variantId, prev + item.quantity);
  }

  if (!variantQuantity.size) {
    return NextResponse.json(
      { ok: false, error: "Could not map items to Printful variants." },
      { status: 400 },
    );
  }

  const itemsForPrintful = Array.from(variantQuantity.entries()).map(
    ([variantId, quantity]) => ({
      variant_id: variantId,
      quantity,
    }),
  );

  const shippingBody = {
    recipient: {
      name: recipient.name,
      address1: recipient.address1,
      city: recipient.city,
      state_code: recipient.stateCode,
      country_code: recipient.countryCode,
      zip: recipient.zip,
    },
    items: itemsForPrintful,
    currency: "USD",
  };

  const res = await fetch("https://api.printful.com/shipping/rates", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PRINTFUL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(shippingBody),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[shipping/quote] Printful error", res.status, text);
    return NextResponse.json(
      { ok: false, error: "Failed to get shipping rates." },
      { status: 500 },
    );
  }

  const json = (await res.json()) as {
    code: number;
    result: Array<{
      id: string;
      name: string;
      rate: string;
      currency: string;
    }>;
  };

  if (!json.result || json.result.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No shipping methods available." },
      { status: 400 },
    );
  }

  const best = json.result[0]; // for now pick the first method
  const printfulRate = parseFloat(best.rate);
  const printfulRateCents = Math.round(printfulRate * 100);
  const handlingCents = 50;
  const totalShippingCents = printfulRateCents + handlingCents;

  return NextResponse.json({
    ok: true,
    printfulRate,
    printfulRateCents,
    handlingCents,
    totalShippingCents,
    methodId: best.id,
    methodName: best.name,
  });
}
