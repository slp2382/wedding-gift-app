// lib/shippoClient.ts
import { Shippo } from "shippo";

const key = process.env.SHIPPO_API_KEY;
if (!key) {
  throw new Error("Missing SHIPPO_API_KEY in environment");
}

// single shared client for server code
export const shippo = new Shippo({
  apiKeyHeader: key,
  // shippoApiVersion: "2024-01-01", // optional pin
});

// simple ping helper if you ever need it
export async function pingShippo() {
  const list = await shippo.addresses.list(1, 1);
  return { ok: true, total: list.count ?? 0 };
}
