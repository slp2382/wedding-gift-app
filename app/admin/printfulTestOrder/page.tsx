"use client";

import { useMemo, useState } from "react";
import { CARD_TEMPLATES } from "@/lib/cardTemplates";
import Link from "next/link";

type CartLine = {
  templateId: string;
  quantity: number;
};

type OkResult = {
  ok: true;
  orderId: string;
  adminSessionId: string;
  cart: CartLine[];
  totalQuantity: number;
  createdCardIds: Array<{ cardId: string; templateId: string }>;
  printfulOrderId: number;
  printfulStatus: string;
};

type ErrResult = {
  error: string;
};

type Result = OkResult | ErrResult;

function clampInt(n: number, lo: number, hi: number) {
  if (!Number.isFinite(n)) return lo;
  const x = Math.floor(n);
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

export default function AdminPrintfulTestOrderPage() {
  const templateOptions = useMemo(
    () => CARD_TEMPLATES.map((t) => ({ id: t.id, name: t.name })),
    [],
  );

  const [selectedTemplateId, setSelectedTemplateId] = useState(
    templateOptions[0]?.id ?? "",
  );

  // Typed quantity input
  const [qtyText, setQtyText] = useState("1");

  const parsedQty = useMemo(() => {
    const n = Number(qtyText);
    if (!Number.isFinite(n)) return 1;
    return clampInt(n, 1, 200);
  }, [qtyText]);

  const [cart, setCart] = useState<CartLine[]>([]);

  const [shippingName, setShippingName] = useState("");
  const [shippingLine1, setShippingLine1] = useState("");
  const [shippingLine2, setShippingLine2] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingPostalCode, setShippingPostalCode] = useState("");
  const [shippingCountry, setShippingCountry] = useState("US");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const totalQuantity = useMemo(
    () => cart.reduce((sum, l) => sum + l.quantity, 0),
    [cart],
  );

  function addToCart() {
    setResult(null);

    const templateId = selectedTemplateId.trim();
    if (!templateId) return;

    const qty = parsedQty;

    setCart((prev) => {
      const idx = prev.findIndex((p) => p.templateId === templateId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          templateId,
          quantity: clampInt(next[idx].quantity + qty, 1, 200),
        };
        return next;
      }
      return [...prev, { templateId, quantity: qty }];
    });
  }

  function removeLine(templateId: string) {
    setCart((prev) => prev.filter((p) => p.templateId !== templateId));
  }

  function clearCart() {
    setCart([]);
    setResult(null);
  }

  async function submitCart() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/printfulTestOrder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: cart,
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
        clearCart();
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

  const templateNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of templateOptions) map.set(t.id, t.name);
    return map;
  }, [templateOptions]);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin Printful order</h1>
        <Link className="text-sm underline" href="/admin">
          Back to admin
        </Link>
      </div>

      <p className="mt-2 text-sm text-slate-600">
        Build an admin cart with multiple templates and quantities, then submit one combined order directly to Printful.
      </p>

      <section className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
        <div className="grid gap-4">
          <label className="grid gap-1">
            <span className="text-sm font-medium">Card template</span>
            <select
              className="rounded-lg border px-3 py-2"
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
            >
              {templateOptions.map((o) => (
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
              inputMode="numeric"
              value={qtyText}
              onChange={(e) => setQtyText(e.target.value)}
              placeholder="Type a quantity"
            />
            <div className="text-xs text-slate-500">
              Typed quantity will be clamped to 1 through 200.
            </div>
          </label>

          <div className="flex gap-2">
            <button
              className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-60"
              onClick={addToCart}
              disabled={!selectedTemplateId}
            >
              Add to cart
            </button>

            <button
              className="rounded-lg border px-4 py-2 disabled:opacity-60"
              onClick={clearCart}
              disabled={cart.length === 0}
            >
              Clear cart
            </button>
          </div>

          <div className="mt-2 rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Admin cart</div>
              <div className="text-sm text-slate-600">Total qty: {totalQuantity}</div>
            </div>

            {cart.length === 0 ? (
              <div className="mt-2 text-sm text-slate-500">
                Cart is empty. Add one or more templates above.
              </div>
            ) : (
              <div className="mt-3 grid gap-2">
                {cart.map((line) => (
                  <div
                    key={line.templateId}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <div className="grid">
                      <div className="text-sm font-medium">
                        {templateNameById.get(line.templateId) || line.templateId}
                      </div>
                      <div className="text-xs text-slate-500">{line.templateId}</div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-sm">Qty: {line.quantity}</div>
                      <button
                        className="text-sm underline"
                        onClick={() => removeLine(line.templateId)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-2 text-sm font-semibold">Shipping for the admin order</div>

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
            onClick={submitCart}
            disabled={loading || cart.length === 0}
          >
            {loading ? "Submitting to Printful..." : "Submit admin cart to Printful"}
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
                <strong>Cards created:</strong>
                <div className="mt-1 grid gap-1">
                  {result.createdCardIds?.slice(0, 50).map((x) => (
                    <div key={x.cardId} className="font-mono text-xs">
                      {x.cardId} ({x.templateId})
                    </div>
                  ))}
                  {result.createdCardIds?.length > 50 && (
                    <div className="text-xs text-slate-700">
                      Showing first 50 of {result.createdCardIds.length}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
