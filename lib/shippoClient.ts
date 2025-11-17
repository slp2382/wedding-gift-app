// lib/shippoClient.ts
import { Shippo } from "shippo";

const key = process.env.SHIPPO_API_KEY;
if (!key) {
  throw new Error("Missing SHIPPO_API_KEY in environment");
}

// Single shared Shippo client for server code
export const shippo = new Shippo({
  apiKeyHeader: key,
  // shippoApiVersion: "2024-01-01", // optional pin
});

// Ping helper with relaxed typing so TS does not complain about "count"
export async function pingShippo() {
  const list: any = await shippo.addresses.list(1, 1);

  // Some SDK responses include "count", others only return "results"
  const total =
    (list as any).count ??
    (Array.isArray(list?.results) ? list.results.length : 0);

  return { ok: true, total };
}
