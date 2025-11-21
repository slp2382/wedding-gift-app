"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "../providers/CartProvider";
import { CARD_TEMPLATES } from "@/lib/cardTemplates";

export default function CartPage() {
  const { items, setQuantity, removeItem, clearCart } = useCart();
  const router = useRouter();
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enrichedItems = items
    .map((item) => {
      const template = CARD_TEMPLATES.find(
        (t) => t.id === item.templateId,
      );
      if (!template) return null;
      return { ...item, template };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const subtotal = 0; // you can compute from template price if you want
  const hasItems = enrichedItems.length > 0;

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
        // optional clearCart here if you want only after payment
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
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Cart
            </h1>
            <p className="text-sm text-zinc-600">
              Review your cards before checkout.
            </p>
          </div>
        </header>

        {!hasItems && (
          <p className="text-sm text-zinc-600">
            Your cart is empty. Visit the shop to add cards.
          </p>
        )}

        {hasItems && (
          <section className="space-y-4">
            {enrichedItems.map((item) => (
              <div
                key={item.templateId}
                className="flex items-center justify-between gap-4 rounded-2xl border bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-semibold">
                    {item.template.name}
                  </div>
                  <div className="text-xs text-zinc-500">
                    Size {item.template.size}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      setQuantity(
                        item.templateId,
                        Number(e.target.value) || 1,
                      )
                    }
                    className="w-16 rounded border px-2 py-1 text-sm"
                  />
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
              className="text-xs text-zinc-500"
            >
              Clear cart
            </button>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={checkingOut}
              className="rounded-full bg-zinc-900 px-6 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {checkingOut ? "Redirecting to checkout" : "Checkout"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
