"use client";

import { useState } from "react";
import Image from "next/image";
import { CARD_TEMPLATES } from "@/lib/cardTemplates";
import { useCart } from "../providers/CartProvider";

export default function ShopPageClient() {
  const { addItem } = useCart();

  const designTemplates = CARD_TEMPLATES.filter((t) =>
    ["card1_4x6", "card1_5x7"].includes(t.id),
  );

  const defaultTemplate = designTemplates[0];

  const [selectedTemplateId, setSelectedTemplateId] = useState(
    defaultTemplate?.id ?? "",
  );
  const [quantity, setQuantity] = useState(1);

  const selectedTemplate =
    designTemplates.find((t) => t.id === selectedTemplateId) ??
    defaultTemplate;

  const handleAddToCart = () => {
    if (!selectedTemplate) return;
    if (quantity <= 0) return;
    addItem(selectedTemplate.id, quantity);
  };

  if (!selectedTemplate) {
    return (
      <div className="mx-auto max-w-3xl text-sm text-red-600">
        Card templates are not configured.
      </div>
    );
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8">
      <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        <div className="grid gap-8 sm:grid-cols-[1.1fr,1fr]">
          {/* Card preview */}
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800">
            <div className="relative aspect-[4/5] w-full">
              <Image
                src={selectedTemplate.previewImage}
                alt={selectedTemplate.name}
                fill
                className="object-cover"
              />
            </div>
          </div>

          {/* Details and controls */}
          <div className="flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Classic GiftLink card
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                A physical greeting card with a smart QR code inside.
                Guests load a cash gift online and the couple scans the same
                code at the wedding to claim it.
              </p>
            </div>

            <div className="space-y-4">
              {/* Size selector */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Card size
                </label>
                <select
                  value={selectedTemplate.id}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-100"
                >
                  {designTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.size === "4x6" ? "4x6" : "5x7"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity selector */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Quantity
                </label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="w-24 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-100"
                />
              </div>
            </div>

            {/* Add to cart button */}
            <button
              type="button"
              onClick={handleAddToCart}
              className="inline-flex w-full items-center justify-center rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Add to cart
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
