// app/api/admin/printfulTestOrder/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createPrintfulOrderForCards } from "@/lib/printful";
import { CARD_TEMPLATES } from "@/lib/cardTemplates";

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

  // optional shipping override
  shippingName?: string;
  shippingLine1?: string;
  shippingLine2?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPostalCode?: string;
  shippingCountry?: string;
};

async function generateGiftlinkInsidePng(cardId: string) {
  const { createCanvas, loadImage } = await import("canvas");
  const QRCode = (await import("qrcode")).default;
  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");

  const WIDTH = 1245;
  const HEIGHT = 1845;

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const baseUrl = (process.env.GIFTLINK_BASE_URL || "https://www.giftlink.cards").replace(
    /\/$/,
    "",
  );
  const cardUrl = `${baseUrl}/card/${cardId}`;

  const qrBuffer = await QRCode.toBuffer(cardUrl, { width: 300, margin: 0 });
  const qrImage = await loadImage(qrBuffer);

  const centerLineY = HEIGHT;

  const bottomMargin = 200;
  const sideMargin = 140;
  const gap = 70;

  const QR_SIZE = 300;

  let logoImg: any = null;
  let logoWidth = 0;
  let logoHeight = 0;

  try {
    const logoPath = path.join(process.cwd(), "public", "giftlink_logo.png");
    const logoBytes = await readFile(logoPath);
    logoImg = await loadImage(logoBytes);

    const aspect = logoImg.height / logoImg.width;

    const maxLogoWidth = WIDTH - sideMargin * 2 - QR_SIZE - gap;
    const desiredLogoWidth = 620;
    logoWidth = Math.max(300, Math.min(desiredLogoWidth, maxLogoWidth));
    logoHeight = Math.round(logoWidth * aspect);
  } catch (err) {
    console.error("[admin print] Logo load failed, continuing with QR only", err);
  }

  const yBottom = centerLineY - bottomMargin;

  const qrX = sideMargin + 80;
  const qrY = Math.round(yBottom - QR_SIZE);

  ctx.drawImage(qrImage, qrX, qrY, QR_SIZE, QR_SIZE);

  if (logoImg) {
    const logoX = Math.round(WIDTH - sideMargin - logoWidth);
    const logoY = Math.round(yBottom - logoHeight);
    ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
  }

  return canvas.toBuffer("image/png");
}

function asPositiveInt(n: unknown, fallback: number) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  const rounded = Math.floor(x);
  return rounded > 0 ? rounded : fallback;
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

    // 1) Create a lightweight orders row so lib/printful can read recipient fields
    const { data: insertedOrder, error: orderInsertError } = await supabaseAdmin
      .from("orders")
      .insert({
        stripe_session_id: null,
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
        status: "admin_test",
      })
      .select("id")
      .single();

    if (orderInsertError || !insertedOrder?.id) {
      console.error("[admin print] Error inserting order", orderInsertError);
      return NextResponse.json({ error: "Failed to create test order row" }, { status: 500 });
    }

    const orderId = insertedOrder.id as string;

    // 2) Create cards, generate inside PNGs, upload, create print jobs
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
        { error: "No cards were generated successfully for this test order", orderId, createdCardIds },
        { status: 500 },
      );
    }

    // 3) Place the Printful draft order using your existing lib/printful code path
    const printfulResult = await createPrintfulOrderForCards({
      orderId,
      cards: cardsForPrintful,
    });

    return NextResponse.json({
      ok: true,
      orderId,
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
