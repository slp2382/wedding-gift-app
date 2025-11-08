// scripts/create_card_batch.js

require("dotenv").config({ path: ".env.factory" });
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

// Load environment values
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GIFTLINK_BASE_URL = process.env.GIFTLINK_BASE_URL || "https://wedding-gift-app.vercel.app";

// Safety checks
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.factory");
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Simple random card id generator
function generateCardId() {
  const rand = crypto.randomBytes(8).toString("hex"); // 16 char hex
  return `card_${rand}`;
}

// Small helper to generate a batch code for your own tracking
function generateBatchCode() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  return `BATCH_${y}${m}${d}_${h}${mi}${s}`;
}

async function main() {
  const count = Number(process.argv[2]) || 10; // default ten cards
  const batchCode = generateBatchCode();

  console.log(`Creating batch "${batchCode}" with ${count} cards`);

  // Create card objects for insertion
  const cards = [];
  for (let i = 0; i < count; i++) {
    const cardId = generateCardId();
    cards.push({
      card_id: cardId,
      giver_name: "",
      amount: 0,
      note: "",
      claimed: false,
      // created_at will use default now from Supabase if configured
    });
  }


  // Insert into Supabase
  const { data, error } = await supabase
    .from("cards")
    .insert(cards)
    .select("card_id");

  if (error) {
    console.error("Error inserting cards:", error);
    process.exit(1);
  }

  console.log(`Inserted ${data.length} cards into Supabase`);

  // Build CSV lines for printer
  // Columns: batch_code,card_id,qr_url
  const header = "batch_code,card_id,qr_url";
  const rows = data.map((row) => {
    const cardId = row.card_id;
    const qrUrl = `${GIFTLINK_BASE_URL}/card/${cardId}`;
    return `"${batchCode}","${cardId}","${qrUrl}"`;
  });

  const csv = [header, ...rows].join("\n");

  // Write to file
  const outputDir = path.join(__dirname, "..", "batches");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const filename = `cards_${batchCode}.csv`;
  const filepath = path.join(outputDir, filename);

  fs.writeFileSync(filepath, csv, "utf8");
  console.log(`Wrote CSV to ${filepath}`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
