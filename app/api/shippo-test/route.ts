// app/api/shippo-test/route.ts
import { NextResponse } from "next/server";
import { shippo } from "../../../lib/shippoClient";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Create minimal addresses
    const from = await shippo.addresses.create({
      name: "GiftLink Test",
      street1: "123 Mint St",
      city: "Charlotte",
      state: "NC",
      zip: "28202",
      country: "US",
      email: "admin@giftlink.cards",
    });

    const to = await shippo.addresses.create({
      name: "GiftLink Recipient",
      street1: "350 5th Ave",
      city: "New York",
      state: "NY",
      zip: "10118",
      country: "US",
      email: "noreply@giftlink.cards",
    });

    // Some SDK responses use objectId, some object_id — handle both
    const fromId = (from as any).objectId ?? (from as any).object_id;
    const toId = (to as any).objectId ?? (to as any).object_id;

    if (!fromId || !toId) {
      throw new Error("Could not resolve address IDs from Shippo response");
    }

    // Relax typing here to avoid strict ParcelCreateRequest / enum issues
    const parcelInput: any = {
      length: "7",
      width: "5",
      height: "0.25",
      distanceUnit: "in", // "cm" | "in" | "ft" | "m" | "mm" | "yd"
      weight: "2",
      massUnit: "oz", // "g" | "kg" | "lb" | "oz"
    };

    // Create the shipment (camelCase keys)
    const shipment = await shippo.shipments.create({
      addressFrom: fromId, // can be an ID or an address object
      addressTo: toId, // can be an ID or an address object
      parcels: [parcelInput], // can be inline objects or parcel IDs
    });

    const shipmentId =
      (shipment as any).objectId ?? (shipment as any).object_id;

    if (!shipmentId) {
      throw new Error("Could not resolve shipment ID from Shippo response");
    }

    // List rates for the shipment
    const rates = await shippo.rates.listShipmentRates(shipmentId);

    const top = (rates.results ?? [])
      .slice()
      .sort((a: any, b: any) => parseFloat(a.amount) - parseFloat(b.amount))
      .slice(0, 5)
      .map((r: any) => ({
        provider: r.provider,
        service: r.servicelevel?.name ?? r.servicelevel,
        amount: r.amount,
        currency: r.currency,
        estimated_days: r.estimated_days,
      }));

    return NextResponse.json({
      ok: true,
      from: `${from.city}, ${from.state}`,
      to: `${to.city}, ${to.state}`,
      parcel: parcelInput,
      shipmentId,
      rates_count: rates.results?.length ?? 0,
      sample_rates: top,
    });
  } catch (err: any) {
    console.error("Shippo test error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Shippo error" },
      { status: 500 },
    );
  }
}
