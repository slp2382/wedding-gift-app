"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "../providers/CartProvider";
import { CARD_TEMPLATES } from "@/lib/cardTemplates";

export default function CartPage() {
  const { items, removeItem, clearCart, itemCount } = useCart();
  const router = useRouter();
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Attach template details to each cart item, skip anything with a missing template
  const enrichedItems = items
    .map((item) => {
      const template = CARD_TEMPLATES.find(
        (t) => t.id === item.templateId,
      );
      if (!template) return null;
      return { ...item, template };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const hasItems = enrichedItems.length > 0;

  const { subtotal, shipping, total } = useMemo(() => {
    let subtotalAcc = 0;

    for (const item of enrichedItems) {
      const qty = item.quantity;
      let unit = 0;

      // Only 4x6 cards exist now
      if (qty >= 5) unit = 4.99;
      else if (qty >= 3) unit = 5.49;
      else unit = 5.99;

      subtotalAcc += unit * qty;
    }

    const shippingAmount = hasItems ? 3.99 : 0;
    const totalAmount = subtotalAcc + shippingAmount;

    return {
      subtotal: subtotalAcc,
      shipping: shippingAmount,
      total: totalAmount,
    };
  }, [enrichedItems, hasItems]);

  const handleCheckout = async () => {
    if (!hasItems) return;
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
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to start checkout");
        setCheckingOut(false);
        return;
      }

      const data = (await res.json()) as { url?: string };
      if (data.url) {
        router.push(data.url);
      } else {
        setError("Missing checkout url");
        setCheckingOut(false);
      }
    } catch (err) {
      console.error("Checkout error", err);
      setError("Failed to start checkout");
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
              Review your cards before checkout.
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

            <section className="mt-4 rounded-2xl border bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Subtotal
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {subtotal.toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Shipping and handling
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {shipping.toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                    })}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-zinc-200 pt-3 dark:border-zinc-800">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Order total
                  </span>
                  <span className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    {total.toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                    })}
                  </span>
                </div>
              </div>
            </section>
          </>
        )}

        {error && (
          <p className="text-sm text-red-600">
            {error}
          </p>
        )}

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
              disabled={checkingOut}
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
