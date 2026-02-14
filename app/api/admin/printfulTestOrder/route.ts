// app/api/admin/printfulTestOrder/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createPrintfulOrderForCards } from "@/lib/printful";
import { CARD_TEMPLATES } from "@/lib/cardTemplates";
import { absoluteUrl } from "@/lib/siteUrl";
import QRCode from "qrcode";
import sharp from "sharp";
import path from "node:path";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Admin Printful test order route is not configured, missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
  );
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export const runtime = "nodejs";

type Body = {
  templateId?: string;
  quantity?: number;

  shippingName?: string;
  shippingLine1?: string;
  shippingLine2?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPostalCode?: string;
  shippingCountry?: string;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function argMaxInRange(arr: number[], start: number, end: number) {
  let bestIdx: number | null = null;
  let bestVal = -Infinity;

  const s = Math.max(0, Math.floor(start));
  const e = Math.min(arr.length - 1, Math.floor(end));

  for (let i = s; i <= e; i++) {
    if (arr[i] > bestVal) {
      bestVal = arr[i];
      bestIdx = i;
    }
  }
  return bestIdx;
}

async function detectGiftBoxWindow(
  templatePath: string,
  targetW: number,
  targetH: number,
): Promise<{ cx: number; cy: number; size: number }> {
  const scanW = 400;
  const scanH = Math.round((targetH / targetW) * scanW);

  const { data, info } = await sharp(templatePath)
    .resize(scanW, scanH)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;

  const x0 = Math.floor(w * 0.52);
  const x1 = Math.floor(w * 0.92);

  const yBandTop = Math.floor(h * 0.55);
  const yBandMid = Math.floor(h * 0.72);
  const yBandBot = Math.floor(h * 0.88);

  const tr = 245;
  const tg = 245;
  const tb = 245;

  const rowScores = new Array(h).fill(0);

  for (let y = yBandTop; y <= yBandBot; y++) {
    const rowOff = y * w * 4;
    for (let x = x0; x <= x1; x++) {
      const i = rowOff + x * 4;
      const a = data[i + 3];
      if (a < 10) continue;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const dr = r - tr;
      const dg = g - tg;
      const db = b - tb;

      const d2 = dr * dr + dg * dg + db * db;
      if (d2 < 60 * 60) rowScores[y] += 1;
    }
  }

  const topEdge = argMaxInRange(rowScores, yBandTop, yBandMid);
  const bottomEdge = argMaxInRange(rowScores, yBandMid, yBandBot);

  if (topEdge == null || bottomEdge == null || bottomEdge - topEdge < 120) {
    return { cx: targetW * 0.72, cy: targetH * 0.78, size: 240 };
  }

  const scaleX = targetW / w;
  const scaleY = targetH / h;

  const inset = 14;
  const innerW = Math.max(80, x1 - x0 - inset * 2);
  const innerH = Math.max(80, bottomEdge - topEdge - inset * 2);
  const innerSize = Math.min(innerW, innerH);

  const cxScan = (x0 + x1) / 2;
  const cyScan = (topEdge + bottomEdge) / 2;

  return {
    cx: cxScan * scaleX,
    cy: cyScan * scaleY,
    size: innerSize * Math.min(scaleX, scaleY),
  };
}

// Matches the Stripe webhook path: template based inside file with QR placed in the gift box window
async function generateGiftlinkInsidePng(cardId: string) {
  const WIDTH = 1245;
  const HEIGHT = 1845;

  const cardUrl = absoluteUrl(`/card/${cardId}`);

  const templatePath = path.join(
    process.cwd(),
    "public",
    "print-templates",
    "inside-right-base.png",
  );

  const box = await detectGiftBoxWindow(templatePath, WIDTH, HEIGHT);
  const qrSize = clamp(Math.floor(box.size * 0.9), 180, 360);

  const qrBuffer = await QRCode.toBuffer(cardUrl, {
    width: qrSize,
    margin: 4,
    errorCorrectionLevel: "H",
    color: { dark: "#000000", light: "#FFFFFF" },
  });

  const qrLeft = Math.round(box.cx - qrSize / 2);
  const qrTop = Math.round(box.cy - qrSize / 2);

  const whitePlate = await sharp({
    create: {
      width: qrSize,
      height: qrSize,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  return await sharp(templatePath)
    .resize(WIDTH, HEIGHT)
    .composite([
      { input: whitePlate, left: qrLeft, top: qrTop },
      { input: qrBuffer, left: qrLeft, top: qrTop },
    ])
    .png()
    .toBuffer();
}

function asPositiveInt(n: unknown, fallback: number) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  const rounded = Math.floor(x);
  return rounded > 0 ? rounded : fallback;
}

function makeAdminTestSessionId() {
  const rand = Math.random().toString(36).slice(2, 10);
  return `admin_test_${Date.now()}_${rand}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null;

    const templateId = (body?.templateId || "").trim();
    const quantity = asPositiveInt(body?.quantity, 1);

    if (!templateId) {
      return NextResponse.json({ error: "templateId is required" }, { status: 400 });
    }

    const template = CARD_TEMPLATES.find((t) => t.id === templateId);
    if (!template) {
      return NextResponse.json({ error: "Unknown templateId" }, { status: 400 });
    }

    // Quantity is supported as "quantity unique cards" (unique QR per card)
    if (quantity > 25) {
      return NextResponse.json(
        { error: "Quantity too large for a test order (max 25)" },
        { status: 400 },
      );
    }

    const shippingName =
      (body?.shippingName || process.env.ADMIN_TEST_SHIP_NAME || "").trim();
    const shippingLine1 =
      (body?.shippingLine1 || process.env.ADMIN_TEST_SHIP_LINE1 || "").trim();
    const shippingLine2 =
      (body?.shippingLine2 || process.env.ADMIN_TEST_SHIP_LINE2 || "").trim();
    const shippingCity =
      (body?.shippingCity || process.env.ADMIN_TEST_SHIP_CITY || "").trim();
    const shippingState =
      (body?.shippingState || process.env.ADMIN_TEST_SHIP_STATE || "").trim();
    const shippingPostalCode =
      (body?.shippingPostalCode || process.env.ADMIN_TEST_SHIP_POSTAL || "").trim();
    const shippingCountry =
      (body?.shippingCountry || process.env.ADMIN_TEST_SHIP_COUNTRY || "US").trim();

    if (
      !shippingName ||
      !shippingLine1 ||
      !shippingCity ||
      !shippingState ||
      !shippingPostalCode ||
      !shippingCountry
    ) {
      return NextResponse.json(
        {
          error:
            "Missing shipping info. Provide it in the form or set ADMIN_TEST_SHIP_NAME, ADMIN_TEST_SHIP_LINE1, ADMIN_TEST_SHIP_CITY, ADMIN_TEST_SHIP_STATE, ADMIN_TEST_SHIP_POSTAL, ADMIN_TEST_SHIP_COUNTRY",
        },
        { status: 400 },
      );
    }

    const adminSessionId = makeAdminTestSessionId();

    // Create an orders row so lib/printful can read shipping fields by orderId
    const { data: insertedOrder, error: orderInsertError } = await supabaseAdmin
      .from("orders")
      .insert({
        stripe_session_id: adminSessionId,
        email: null,

        shipping_name: shippingName,
        shipping_address_line1: shippingLine1,
        shipping_address_line2: shippingLine2 || null,
        shipping_city: shippingCity,
        shipping_state: shippingState,
        shipping_postal_code: shippingPostalCode,
        shipping_country: shippingCountry,

        items: [{ product: `admin_test:${templateId}`, quantity }],
        amount_total: 0,

        status: "paid",
      })
      .select("id")
      .single();

    if (orderInsertError || !insertedOrder?.id) {
      console.error("[admin print] Error inserting order", orderInsertError);
      return NextResponse.json(
        {
          error: "Failed to create test order row",
          details: orderInsertError?.message ?? "Unknown insert error",
          code: (orderInsertError as any)?.code ?? null,
        },
        { status: 500 },
      );
    }

    const orderId = insertedOrder.id as string;

    const cardsForPrintful: {
      cardId: string;
      storagePath: string;
      templateId: string | null;
    }[] = [];

    const createdCardIds: string[] = [];

    for (let i = 0; i < quantity; i++) {
      const cardId = `test_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
      createdCardIds.push(cardId);

      const { error: cardInsertError } = await supabaseAdmin.from("cards").insert({
        card_id: cardId,
        giver_name: "Admin test card",
        amount: 0,
        note: null,
        claimed: false,
      });

      if (cardInsertError && (cardInsertError as any).code !== "23505") {
        console.error("[admin print] Error inserting card", cardInsertError);
        continue;
      }

      try {
        const pngBytes = await generateGiftlinkInsidePng(cardId);
        const pngPath = `cards/${cardId}.png`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from("printfiles")
          .upload(pngPath, pngBytes, {
            contentType: "image/png",
            upsert: true,
          });

        const { data: publicUrlData } = supabaseAdmin.storage
          .from("printfiles")
          .getPublicUrl(pngPath);

        const publicUrl = publicUrlData?.publicUrl ?? null;

        await supabaseAdmin
          .from("cards")
          .update({
            printed: uploadError ? false : true,
            print_file_url: publicUrl,
          })
          .eq("card_id", cardId);

        const { error: jobError } = await supabaseAdmin.from("card_print_jobs").insert({
          card_id: cardId,
          order_id: orderId,
          pdf_path: pngPath,
          status: uploadError ? "error" : "generated",
          error_message: uploadError ? uploadError.message : null,
          fulfillment_status: "pending",
        });

        if (jobError) {
          console.error("[admin print] Error inserting card_print_jobs", jobError);
          continue;
        }

        if (!uploadError) {
          cardsForPrintful.push({
            cardId,
            storagePath: pngPath,
            templateId,
          });
        }
      } catch (err) {
        console.error("[admin print] Error generating or uploading PNG", cardId, err);
      }
    }

    if (cardsForPrintful.length === 0) {
      return NextResponse.json(
        {
          error: "No cards were generated successfully for this test order",
          orderId,
          createdCardIds,
        },
        { status: 500 },
      );
    }

    const printfulResult = await createPrintfulOrderForCards({
      orderId,
      cards: cardsForPrintful,
    });

    return NextResponse.json({
      ok: true,
      orderId,
      adminSessionId,
      templateId,
      quantity,
      createdCardIds,
      printfulOrderId: printfulResult.printfulOrderId,
      printfulStatus: printfulResult.status,
    });
  } catch (err) {
    console.error("[admin print] Unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected error creating Printful test order" },
      { status: 500 },
    );
  }
}
