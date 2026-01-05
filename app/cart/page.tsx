"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "../providers/CartProvider";
import { CARD_TEMPLATES } from "@/lib/cardTemplates";

type Recipient = {
  name: string;
  address1: string;
  city: string;
  stateCode: string;
  countryCode: string;
  zip: string;
};

type ShippingQuoteResponse = {
  ok: boolean;
  error?: string;
  printfulRate: number;
  printfulRateCents: number;
  handlingCents: number;
  totalShippingCents: number;
  methodId: string;
  methodName: string;
};

type DiscountPreviewOk = {
  ok: true;
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  discountAmountCents: number;
  productSubtotalCents: number;
  productSubtotalAfterDiscountCents: number;
  message?: string;
};

type DiscountPreviewErr = {
  ok: false;
  error: string;
};

type DiscountPreviewResponse = DiscountPreviewOk | DiscountPreviewErr;

export default function CartPage() {
  const { items, removeItem, clearCart, itemCount } = useCart();
  const router = useRouter();
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recipient, setRecipient] = useState<Recipient>({
    name: "",
    address1: "",
    city: "",
    stateCode: "",
    countryCode: "US",
    zip: "",
  });

  const [shippingQuote, setShippingQuote] = useState<ShippingQuoteResponse | null>(null);
  const [quoting, setQuoting] = useState(false);

  const [discountInput, setDiscountInput] = useState("");
  const [discountApplying, setDiscountApplying] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountPreviewOk | null>(null);

  const itemsSignature = useMemo(() => JSON.stringify(items ?? []), [items]);

  useEffect(() => {
    setAppliedDiscount(null);
    setDiscountInput("");
  }, [itemsSignature]);

  // Attach template details to each cart item, skip anything with a missing template
  const enrichedItems = items
    .map((item) => {
      const template = CARD_TEMPLATES.find((t) => t.id === item.templateId);
      if (!template) return null;
      return { ...item, template };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const hasItems = enrichedItems.length > 0;

  const subtotal = useMemo(() => {
    let subtotalAcc = 0;

    for (const item of enrichedItems) {
      const qty = item.quantity;
      let unit = 0;

      // Only four by six cards exist now
      if (qty >= 5) unit = 4.99;
      else if (qty >= 3) unit = 5.49;
      else unit = 5.99;

      subtotalAcc += unit * qty;
    }

    return subtotalAcc;
  }, [enrichedItems]);

  const discountAmount =
    appliedDiscount ? appliedDiscount.discountAmountCents / 100 : 0;

  const shippingAmount =
    hasItems && shippingQuote ? shippingQuote.totalShippingCents / 100 : 0;

  const total = subtotal - discountAmount + shippingAmount;

  const addressComplete =
    recipient.name.trim() &&
    recipient.address1.trim() &&
    recipient.city.trim() &&
    recipient.stateCode.trim() &&
    recipient.zip.trim();

  const handleGetShippingQuote = async () => {
    if (!hasItems) return;
    if (!addressComplete) {
      setError("Please enter your full shipping address first.");
      return;
    }

    try {
      setQuoting(true);
      setError(null);
      setShippingQuote(null);

      const res = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            templateId: i.templateId,
            quantity: i.quantity,
          })),
          recipient,
        }),
      });

      const data = (await res.json()) as ShippingQuoteResponse;

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed to get shipping quote.");
        setQuoting(false);
        return;
      }

      setShippingQuote(data);
      setQuoting(false);
    } catch (err) {
      console.error("Shipping quote error", err);
      setError("Failed to get shipping quote.");
      setQuoting(false);
    }
  };

  const handleApplyDiscount = async () => {
    if (!hasItems) return;

    const raw = discountInput.trim();
    if (!raw) {
      setAppliedDiscount(null);
      return;
    }

    try {
      setDiscountApplying(true);
      setError(null);

      const res = await fetch("/api/discount/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: raw,
          items: items.map((i) => ({
            templateId: i.templateId,
            quantity: i.quantity,
          })),
        }),
      });

      const data = (await res.json()) as DiscountPreviewResponse;

      if (!res.ok || !data.ok) {
        setAppliedDiscount(null);
        setError((data as DiscountPreviewErr).error ?? "Invalid discount code.");
        setDiscountApplying(false);
        return;
      }

      setAppliedDiscount(data as DiscountPreviewOk);
      setDiscountApplying(false);
    } catch (err) {
      console.error("Discount preview error", err);
      setAppliedDiscount(null);
      setError("Failed to validate discount code.");
      setDiscountApplying(false);
    }
  };

  const handleCheckout = async () => {
    if (!hasItems) return;
    if (!shippingQuote) {
      setError("Please get a shipping quote before checkout.");
      return;
    }

    try {
      setCheckingOut(true);
      setError(null);

      const res = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            templateId: i.templateId,
            quantity: i.quantity,
          })),
          recipient,
          discountCode: appliedDiscount?.code ?? null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to start checkout.");
        setCheckingOut(false);
        return;
      }

      const data = (await res.json()) as { url?: string };
      if (data.url) {
        router.push(data.url);
      } else {
        setError("Missing checkout url.");
        setCheckingOut(false);
      }
    } catch (err) {
      console.error("Checkout error", err);
      setError("Failed to start checkout.");
      setCheckingOut(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Cart
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Review your cards and shipping before checkout.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/shop"
              className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
            >
              Return to shop
            </Link>
            <Link
              href="/cart"
              className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
            >
              Cart {itemCount > 0 ? `(${itemCount})` : ""}
            </Link>
          </div>
        </header>

        {!hasItems && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Your cart is empty. Visit the shop to add cards.
          </p>
        )}

        {hasItems && (
          <>
            <section className="space-y-4">
              {enrichedItems.map((item) => (
                <div
                  key={item.templateId}
                  className="flex items-center justify-between gap-4 rounded-2xl border bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {item.template.name}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      Size {item.template.size}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      Quantity {item.quantity}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => removeItem(item.templateId)}
                      className="text-xs text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </section>

            <section className="mt-4 rounded-2xl border bg-white p-4 shadow-sm space-y-3 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Shipping address
              </h2>
              <div className="grid grid-cols-1 gap-3">
                <input
                  className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                  placeholder="Full name"
                  value={recipient.name}
                  onChange={(e) =>
                    setRecipient((r) => ({ ...r, name: e.target.value }))
                  }
                />
                <input
                  className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                  placeholder="Street address"
                  value={recipient.address1}
                  onChange={(e) =>
                    setRecipient((r) => ({ ...r, address1: e.target.value }))
                  }
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <input
                    className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                    placeholder="City"
                    value={recipient.city}
                    onChange={(e) =>
                      setRecipient((r) => ({ ...r, city: e.target.value }))
                    }
                  />
                  <input
                    className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                    placeholder="State"
                    value={recipient.stateCode}
                    onChange={(e) =>
                      setRecipient((r) => ({ ...r, stateCode: e.target.value }))
                    }
                  />
                  <input
                    className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                    placeholder="ZIP code"
                    value={recipient.zip}
                    onChange={(e) =>
                      setRecipient((r) => ({ ...r, zip: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Shipping is calculated based on your address.
                </p>
                <button
                  type="button"
                  onClick={handleGetShippingQuote}
                  disabled={quoting || !hasItems}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {quoting ? "Calculating" : "Update shipping"}
                </button>
              </div>

              {shippingQuote && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Method {shippingQuote.methodName} · Estimated shipping and handling{" "}
                  {(shippingQuote.totalShippingCents / 100).toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                  })}
                </p>
              )}
            </section>

            <section className="mt-4 rounded-2xl border bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      Discount code
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      Applies to products only, not shipping.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                    placeholder="Enter code"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleApplyDiscount}
                    disabled={discountApplying}
                    className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    {discountApplying ? "Applying" : "Apply"}
                  </button>
                </div>

                {appliedDiscount && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Code {appliedDiscount.code} applied.
                  </p>
                )}
              </div>
            </section>

            <section className="mt-4 rounded-2xl border bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">Subtotal</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {subtotal.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                  </span>
                </div>

                {appliedDiscount && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      Discount
                    </span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">
                      {(0 - discountAmount).toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Shipping and handling
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {shippingAmount > 0
                      ? shippingAmount.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })
                      : "Enter address to calculate"}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between border-t border-zinc-200 pt-3 dark:border-zinc-800">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Order total
                  </span>
                  <span className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    {total.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                  </span>
                </div>
              </div>
            </section>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {hasItems && (
          <div className="mt-4 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={clearCart}
              className="text-xs text-zinc-500 dark:text-zinc-400"
            >
              Clear cart
            </button>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={checkingOut || !shippingQuote}
              className="rounded-full bg-zinc-900 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {checkingOut ? "Redirecting to checkout" : "Checkout"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
