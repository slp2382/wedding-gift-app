"use client";

import { useMemo, useState } from "react";
import { CARD_TEMPLATES } from "@/lib/cardTemplates";
import Link from "next/link";

type OkResult = {
  ok: true;
  orderId: string;
  adminSessionId: string;
  templateId: string;
  quantity: number;
  createdCardIds: string[];
  printfulOrderId: number;
  printfulStatus: string;
};

type ErrResult = {
  error: string;
};

type Result = OkResult | ErrResult;

export default function AdminPrintfulTestOrderPage() {
  const options = useMemo(
    () => CARD_TEMPLATES.map((t) => ({ id: t.id, name: t.name })),
    [],
  );

  const [templateId, setTemplateId] = useState(options[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);

  const [shippingName, setShippingName] = useState("");
  const [shippingLine1, setShippingLine1] = useState("");
  const [shippingLine2, setShippingLine2] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingPostalCode, setShippingPostalCode] = useState("");
  const [shippingCountry, setShippingCountry] = useState("US");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  function clampQty(n: number) {
    if (!Number.isFinite(n)) return 1;
    const x = Math.floor(n);
    if (x < 1) return 1;
    if (x > 25) return 25;
    return x;
  }

  async function placeTestOrder() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/printfulTestOrder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          quantity: clampQty(quantity),

          shippingName,
          shippingLine1,
          shippingLine2,
          shippingCity,
          shippingState,
          shippingPostalCode,
          shippingCountry,
        }),
      });

      const json = (await res.json().catch(() => null)) as any;

      if (!res.ok) {
        setResult({ error: (json && json.error) || "Request failed" });
      } else {
        setResult(json as Result);
      }
    } catch (e: any) {
      setResult({ error: e?.message || "Network error" });
    }

    setLoading(false);
  }

  const printfulDashboardOrderUrl =
    result && "ok" in result && result.ok && result.printfulOrderId
      ? `https://www.printful.com/dashboard/default/orders/${result.printfulOrderId}`
      : null;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Printful test order</h1>
        <Link className="text-sm underline" href="/admin">
          Back to admin
        </Link>
      </div>

      <p className="mt-2 text-sm text-slate-600">
        Creates a draft Printful order without Stripe by generating fresh card ids and inside print PNGs.
      </p>

      <section className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
        <div className="grid gap-4">
          <label className="grid gap-1">
            <span className="text-sm font-medium">Card template</span>
            <select
              className="rounded-lg border px-3 py-2"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.id})
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium">Quantity</span>
            <input
              className="rounded-lg border px-3 py-2"
              type="number"
              min={1}
              max={25}
              value={quantity}
              onChange={(e) => setQuantity(clampQty(Number(e.target.value)))}
            />
            <div className="text-xs text-slate-500">
              Quantity creates unique cards, one QR per card, max 25 for test orders.
            </div>
          </label>

          <div className="mt-2 text-sm font-semibold">Shipping for the test order</div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              className="rounded-lg border px-3 py-2"
              placeholder="Name"
              value={shippingName}
              onChange={(e) => setShippingName(e.target.value)}
            />
            <input
              className="rounded-lg border px-3 py-2"
              placeholder="Country (US)"
              value={shippingCountry}
              onChange={(e) => setShippingCountry(e.target.value)}
            />
            <input
              className="rounded-lg border px-3 py-2 sm:col-span-2"
              placeholder="Address line 1"
              value={shippingLine1}
              onChange={(e) => setShippingLine1(e.target.value)}
            />
            <input
              className="rounded-lg border px-3 py-2 sm:col-span-2"
              placeholder="Address line 2 (optional)"
              value={shippingLine2}
              onChange={(e) => setShippingLine2(e.target.value)}
            />
            <input
              className="rounded-lg border px-3 py-2"
              placeholder="City"
              value={shippingCity}
              onChange={(e) => setShippingCity(e.target.value)}
            />
            <input
              className="rounded-lg border px-3 py-2"
              placeholder="State"
              value={shippingState}
              onChange={(e) => setShippingState(e.target.value)}
            />
            <input
              className="rounded-lg border px-3 py-2"
              placeholder="Postal code"
              value={shippingPostalCode}
              onChange={(e) => setShippingPostalCode(e.target.value)}
            />
          </div>

          <button
            className="mt-3 rounded-lg bg-black px-4 py-2 text-white disabled:opacity-60"
            onClick={placeTestOrder}
            disabled={loading || !templateId}
          >
            {loading ? "Placing draft Printful order..." : "Place draft Printful order"}
          </button>

          {result && "error" in result && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {result.error}
            </div>
          )}

          {result && "ok" in result && result.ok && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              <div>
                <strong>Supabase order id:</strong> {result.orderId}
              </div>

              <div>
                <strong>Admin session id:</strong>{" "}
                <span className="font-mono text-xs">{result.adminSessionId}</span>
              </div>

              <div>
                <strong>Template:</strong> {result.templateId}
              </div>

              <div>
                <strong>Quantity:</strong> {result.quantity}
              </div>

              <div className="mt-2">
                <strong>Printful order id:</strong> {result.printfulOrderId} ({result.printfulStatus})
                {printfulDashboardOrderUrl && (
                  <span className="ml-2">
                    <a
                      className="underline"
                      href={printfulDashboardOrderUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open in Printful
                    </a>
                  </span>
                )}
              </div>

              <div className="mt-3">
                <strong>Card ids created:</strong>
                <div className="mt-1 grid gap-1">
                  {result.createdCardIds?.map((id) => (
                    <div key={id} className="font-mono text-xs">
                      {id}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
