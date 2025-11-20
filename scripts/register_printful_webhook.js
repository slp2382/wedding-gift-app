/**
 * scripts/register_printful_webhook.js
 *
 * Registers your Printful webhook pointing to:
 *   https://www.giftlink.cards/api/printful-webhook
 *
 * Usage:
 *   node scripts/register_printful_webhook.js
 */

import fetch from "node-fetch";

// Load environment variables
import "dotenv/config";

const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
if (!PRINTFUL_API_KEY) {
  console.error("Missing PRINTFUL_API_KEY in environment");
  process.exit(1);
}

const WEBHOOK_URL = "https://www.giftlink.cards/api/printful-webhook";

// These are recommended Printful events:
const EVENTS = [
  "package_shipped",
  "order_updated",
  "order_created",
  "order_failed",
  "order_canceled",
];

async function registerWebhook() {
  console.log("Registering Printful webhook…");

  try {
    const response = await fetch("https://api.printful.com/webhooks", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PRINTFUL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: WEBHOOK_URL,
        types: EVENTS,
      }),
    });

    const body = await response.json();

    if (!response.ok) {
      console.error("❌ Printful API error:", body);
      process.exit(1);
    }

    console.log("✅ Webhook registration successful!");
    console.log(JSON.stringify(body, null, 2));
  } catch (err) {
    console.error("Unexpected error registering webhook:", err);
    process.exit(1);
  }
}

registerWebhook();
