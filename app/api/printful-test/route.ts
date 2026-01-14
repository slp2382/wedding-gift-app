import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createPrintfulOrderForCards } from "@/lib/printful";
import { CARD_TEMPLATES } from "@/lib/cardTemplates";
import QRCode from "qrcode";
import sharp from "sharp";
import path from "path";

export const runtime = "nodejs";

function getSupabaseAdmin(): SupabaseClient | null {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!supabaseUrl || !supabaseServiceKey) return null;

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function argMaxInRange(arr: Int32Array, start: number, end: number) {
  let bestIdx: number | null = null;
  let bestVal = -1;
  for (let i = start; i < end; i++) {
    const v = arr[i] ?? 0;
    if (v > bestVal) {
      bestVal = v;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function findTwoEdgeClusters(scores: Int32Array) {
  let max = 0;
  for (let i = 0; i < scores.length; i++) max = Math.max(max, scores[i] ?? 0);
  if (max <= 0)
    return { leftEdge: null as number | null, rightEdge: null as number | null };

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

  const topEdge = argMaxInRange(rowScores, yBandTop, yBandMid);
  const bottomEdge = argMaxInRange(rowScores, yBandMid, yBandBot);

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

async function generateInsidePng(cardId: string) {
  const WIDTH = 1245;
  const HEIGHT = 1845;

  const cardUrl = `https://www.giftlink.cards/card/${cardId}`;

  const dash = String.fromCharCode(45);
  const printTemplatesDir = "print" + dash + "templates";
  const insideRightBaseName = "inside" + dash + "right" + dash + "base.png";

  const templatePath = path.join(
    process.cwd(),
    "public",
    printTemplatesDir,
    insideRightBaseName,
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

  const resultBuffer = await sharp(templatePath)
    .resize(WIDTH, HEIGHT)
    .composite([
      { input: whitePlate, left: qrLeft, top: qrTop },
      { input: qrBuffer, left: qrLeft, top: qrTop },
    ])
    .png()
    .toBuffer();

  return resultBuffer;
}

type Body = {
  orderId: string;
  templateId?: string;
  quantity?: number;
  cardIds?: string[];
};

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 },
      );
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body?.orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 },
      );
    }

    const orderId = body.orderId;

    const requestedQty =
      typeof body.quantity === "number" && Number.isFinite(body.quantity)
        ? Math.max(1, Math.floor(body.quantity))
        : 1;

    const resolvedTemplateId =
      (typeof body.templateId === "string" && body.templateId.trim()) ||
      (CARD_TEMPLATES[0]?.id ?? null);

    if (!resolvedTemplateId) {
      return NextResponse.json(
        { error: "No templateId provided and no default template found" },
        { status: 400 },
      );
    }

    const cardIds: string[] =
      Array.isArray(body.cardIds) && body.cardIds.length > 0
        ? body.cardIds.filter((x) => typeof x === "string" && x.trim().length > 0)
        : [];

    while (cardIds.length < requestedQty) {
      cardIds.push(`card_${Math.random().toString(36).slice(2, 10)}`);
    }

    const cardsForPrintful: {
      cardId: string;
      storagePath: string;
      templateId: string;
    }[] = [];

    for (let i = 0; i < requestedQty; i++) {
      const cardId = cardIds[i];

      const { error: cardInsertError } = await supabaseAdmin.from("cards").insert({
        card_id: cardId,
        giver_name: "Store card",
        amount: 0,
        note: null,
        claimed: false,
      });

      if (cardInsertError && (cardInsertError as any).code !== "23505") {
        console.error("[printfulTestOrder] Error inserting card", cardId, cardInsertError);
        continue;
      }

      const pngBytes = await generateInsidePng(cardId);
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

      console.log("[printfulTestOrder] print file url", publicUrl);

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
        console.error("[printfulTestOrder] Error inserting card_print_jobs", jobError);
        continue;
      }

      if (!uploadError) {
        cardsForPrintful.push({
          cardId,
          storagePath: pngPath,
          templateId: resolvedTemplateId,
        });
      }
    }

    if (cardsForPrintful.length === 0) {
      return NextResponse.json(
        { error: "No cards generated successfully" },
        { status: 500 },
      );
    }

    const { printfulOrderId, status } = await createPrintfulOrderForCards({
      orderId,
      cards: cardsForPrintful,
    });

    return NextResponse.json(
      {
        ok: true,
        orderId,
        templateId: resolvedTemplateId,
        quantity: requestedQty,
        cardIds: cardsForPrintful.map((c) => c.cardId),
        printfulOrderId,
        status,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[printfulTestOrder] Error creating Printful test order", err);
    return NextResponse.json(
      { error: "Failed to create Printful test order" },
      { status: 500 },
    );
  }
}
