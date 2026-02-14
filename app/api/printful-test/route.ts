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

type CartItem = {
  templateId: string;
  quantity: number;
};

type Body = {
  // Backward compatible single item mode
  templateId?: string;
  quantity?: number;

  // New cart mode
  cartItems?: CartItem[];

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

function findTwoEdgeClusters(scores: Int32Array) {
  let max = 0;
  for (let i = 0; i < scores.length; i++) max = Math.max(max, scores[i] ?? 0);
  if (max <= 0) {
    return { leftEdge: null as number | null, rightEdge: null as number | null };
  }

  const thr = Math.floor(max * 0.7);

  const hits: number[] = [];
  for (let i = 0; i < scores.length; i++) {
    if ((scores[i] ?? 0) >= thr) hits.push(i);
  }

  if (hits.length < 2) return { leftEdge: null, rightEdge: null };

  const clusters: Array<{ start: number; end: number }> = [];
  let s = hits[0];
  let p = hits[0];
  for (let k = 1; k < hits.length; k++) {
    const x = hits[k];
    if (x === p + 1) {
      p = x;
    } else {
      clusters.push({ start: s, end: p });
      s = p = x;
    }
  }
  clusters.push({ start: s, end: p });

  if (clusters.length < 2) return { leftEdge: null, rightEdge: null };

  const left = clusters[0];
  const right = clusters[clusters.length - 1];

  return {
    leftEdge: left.start,
    rightEdge: right.end,
  };
}

// Gift box detection matching production behavior
async function detectGiftBoxWindow(
  templatePath: string,
  width: number,
  height: number,
): Promise<{ cx: number; cy: number; size: number }> {
  const { data, info } = await sharp(templatePath)
    .resize(width, height)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;

  // Gift box stroke color
  const tr = 186;
  const tg = 230;
  const tb = 253;

  const yBandTop = Math.floor(h * 0.65);
  const yBandMid = Math.floor(h * 0.78);
  const yBandBot = Math.floor(h * 0.92);

  const colScores = new Int32Array(w);
  for (let y = yBandMid; y < Math.floor(h * 0.83); y++) {
    const rowOff = y * w * 4;
    for (let x = 0; x < w; x++) {
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
      if (d2 < 60 * 60) colScores[x] += 1;
    }
  }

  const { leftEdge, rightEdge } = findTwoEdgeClusters(colScores);
  if (leftEdge == null || rightEdge == null || rightEdge - leftEdge < 120) {
    return { cx: w / 2, cy: h * 0.78, size: 240 };
  }

  const x0 = Math.max(0, leftEdge);
  const x1 = Math.min(w - 1, rightEdge);

  const rowScores = new Int32Array(h);
  for (let y = yBandTop; y < yBandBot; y++) {
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

  let topEdge: number | null = null;
  let bestTop = -1;
  for (let y = yBandTop; y < yBandMid; y++) {
    const v = rowScores[y] ?? 0;
    if (v > bestTop) {
      bestTop = v;
      topEdge = y;
    }
  }

  let bottomEdge: number | null = null;
  let bestBot = -1;
  for (let y = yBandMid; y < yBandBot; y++) {
    const v = rowScores[y] ?? 0;
    if (v > bestBot) {
      bestBot = v;
      bottomEdge = y;
    }
  }

  if (topEdge == null || bottomEdge == null || bottomEdge - topEdge < 120) {
    return { cx: (x0 + x1) / 2, cy: h * 0.78, size: 240 };
  }

  const inset = 14;
  const innerW = Math.max(80, x1 - x0 - inset * 2);
  const innerH = Math.max(80, bottomEdge - topEdge - inset * 2);
  const innerSize = Math.min(innerW, innerH);

  return {
    cx: (x0 + x1) / 2,
    cy: (topEdge + bottomEdge) / 2,
    size: innerSize,
  };
}

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

function normalizeCart(body: Body): CartItem[] {
  if (Array.isArray(body.cartItems) && body.cartItems.length > 0) {
    return body.cartItems
      .map((i) => ({
        templateId: String(i.templateId || "").trim(),
        quantity: asPositiveInt(i.quantity, 1),
      }))
      .filter((i) => i.templateId && i.quantity > 0);
  }

  const singleTemplate = String(body.templateId || "").trim();
  const singleQty = asPositiveInt(body.quantity, 1);
  if (singleTemplate) return [{ templateId: singleTemplate, quantity: singleQty }];
  return [];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const cart = normalizeCart(body);
    if (cart.length === 0) {
      return NextResponse.json(
        { error: "Provide templateId plus quantity or cartItems" },
        { status: 400 },
      );
    }

    // Validate templates and clamp quantities
    const validatedCart: CartItem[] = [];
    let totalQty = 0;

    for (const item of cart) {
      const templateId = item.templateId;
      const template = CARD_TEMPLATES.find((t) => t.id === templateId);
      if (!template) {
        return NextResponse.json({ error: `Unknown templateId: ${templateId}` }, { status: 400 });
      }

      const qty = clamp(item.quantity, 1, 200);
      validatedCart.push({ templateId, quantity: qty });
      totalQty += qty;
    }

    // Safety cap for admin test
    if (totalQty > 200) {
      return NextResponse.json(
        { error: "Total quantity too large for an admin order (max 200)" },
        { status: 400 },
      );
    }

    const shippingName =
      (body.shippingName || process.env.ADMIN_TEST_SHIP_NAME || "").trim();
    const shippingLine1 =
      (body.shippingLine1 || process.env.ADMIN_TEST_SHIP_LINE1 || "").trim();
    const shippingLine2 =
      (body.shippingLine2 || process.env.ADMIN_TEST_SHIP_LINE2 || "").trim();
    const shippingCity =
      (body.shippingCity || process.env.ADMIN_TEST_SHIP_CITY || "").trim();
    const shippingState =
      (body.shippingState || process.env.ADMIN_TEST_SHIP_STATE || "").trim();
    const shippingPostalCode =
      (body.shippingPostalCode || process.env.ADMIN_TEST_SHIP_POSTAL || "").trim();
    const shippingCountry =
      (body.shippingCountry || process.env.ADMIN_TEST_SHIP_COUNTRY || "US").trim();

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

        items: validatedCart.map((i) => ({
          product: `admin_test:${i.templateId}`,
          quantity: i.quantity,
        })),
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

    const createdCardIds: Array<{ cardId: string; templateId: string }> = [];

    for (const line of validatedCart) {
      for (let i = 0; i < line.quantity; i++) {
        const cardId = `test_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
        createdCardIds.push({ cardId, templateId: line.templateId });

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

          await supabaseAdmin.from("card_print_jobs").insert({
            card_id: cardId,
            order_id: orderId,
            pdf_path: pngPath,
            status: uploadError ? "error" : "generated",
            error_message: uploadError ? uploadError.message : null,
            fulfillment_status: "pending",
          });

          if (!uploadError) {
            cardsForPrintful.push({
              cardId,
              storagePath: pngPath,
              templateId: line.templateId,
            });
          }
        } catch (err) {
          console.error("[admin print] Error generating or uploading PNG", cardId, err);
        }
      }
    }

    if (cardsForPrintful.length === 0) {
      return NextResponse.json(
        {
          error: "No cards were generated successfully for this admin order",
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
      cart: validatedCart,
      totalQuantity: totalQty,
      createdCardIds,
      printfulOrderId: printfulResult.printfulOrderId,
      printfulStatus: printfulResult.status,
    });
  } catch (err) {
    console.error("[admin print] Unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected error creating Printful admin order" },
      { status: 500 },
    );
  }
}
