// lib/printTemplate.ts
import QRCode from "qrcode";
import path from "path";
import sharp from "sharp";

// Physical size: 4.15" x 6.15" at 300 DPI => 1245 x 1845 pixels
const PAGE_WIDTH = 1245;
const PAGE_HEIGHT = 1845;

// These match the base artwork we created
const OVERLAY_SIZE = 560;
const OVERLAY_BOTTOM_MARGIN = 150;

// Tune these if you want the QR larger or positioned slightly differently
const QR_SIZE = 360;     // final rendered QR size in pixels
const QR_MARGIN = 4;     // quiet zone
const QR_Y_OFFSET = 120; // distance from overlay top to QR top

export async function generateGiftlinkInsidePng(cardId: string) {
  const cardUrl = `https://www.giftlink.cards/card/${cardId}`;

  // Generate QR at the exact size we will print, with a quiet zone
  const qrBuffer = await QRCode.toBuffer(cardUrl, {
    width: QR_SIZE,
    margin: QR_MARGIN,
    errorCorrectionLevel: "H",
    color: { dark: "#000000", light: "#FFFFFF" },
  });

  const templatePath = path.join(
    process.cwd(),
    "public",
    "print-templates",
    "inside-right-base.png",
  );

  const base = sharp(templatePath).resize(PAGE_WIDTH, PAGE_HEIGHT);

  // Overlay is bottom centered in the base artwork
  const overlayTop = PAGE_HEIGHT - OVERLAY_SIZE - OVERLAY_BOTTOM_MARGIN;

  // Center QR horizontally and place it inside the gift box window
  const qrX = Math.round((PAGE_WIDTH - QR_SIZE) / 2);
  const qrY = Math.round(overlayTop + QR_Y_OFFSET);

  // Optional white plate for extra safety (QR stays black/white)
  const whitePlate = await sharp({
    create: {
      width: QR_SIZE,
      height: QR_SIZE,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const resultBuffer = await base
    .composite([
      { input: whitePlate, left: qrX, top: qrY },
      { input: qrBuffer, left: qrX, top: qrY },
    ])
    .png()
    .toBuffer();

  return resultBuffer;
}
