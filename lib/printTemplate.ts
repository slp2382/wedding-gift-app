// lib/printTemplate.ts
import QRCode from "qrcode";
import path from "path";
import sharp from "sharp";

// Physical size: 4.15" x 6.15" at 300 DPI => 1245 x 1845 pixels
const PAGE_WIDTH = 1245;
const PAGE_HEIGHT = 1845;

/**
 * Generate a PNG of the inside-right panel with:
 * - your inside-right-base.png background
 * - a QR code centered horizontally, positioned at y ~ 320
 */
export async function generateGiftlinkInsidePng(cardId: string) {
  const cardUrl = `https://www.giftlink.cards/card/${cardId}`;

  // 1) Generate QR code PNG buffer
  const qrBuffer = await QRCode.toBuffer(cardUrl, {
    width: 600,
    margin: 0,
  });

  // 2) Load the base inside-right template
  const templatePath = path.join(
    process.cwd(),
    "public",
    "print-templates",
    "inside-right-base.png",
  );

  // Ensure base is the expected size
  const base = sharp(templatePath).resize(PAGE_WIDTH, PAGE_HEIGHT);

  // 3) Compute QR placement (same as PDF layout)
  const qrSize = 400;
  const qrX = Math.round((PAGE_WIDTH - qrSize) / 2);
  const qrY = 320; // tweak if you want to nudge vertically

  // 4) Composite QR onto the base image
  const resultBuffer = await base
    .composite([
      {
        input: qrBuffer,
        left: qrX,
        top: qrY,
      },
    ])
    .png()
    .toBuffer();

  return resultBuffer; // Buffer with PNG data
}
