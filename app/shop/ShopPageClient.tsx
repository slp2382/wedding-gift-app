"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { CARD_TEMPLATES } from "@/lib/cardTemplates";
import { useCart } from "../providers/CartProvider";

export default function ShopPageClient() {
  const { addItem } = useCart();

  const templates = CARD_TEMPLATES;
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    templates[0]?.id ?? "",
  );
  const selectedTemplate =
    templates.find((t) => t.id === selectedTemplateId) ?? templates[0];

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState<1 | 3 | 5>(1);

  if (!selectedTemplate) {
    return (
      <div className="mx-auto max-w-3xl text-sm text-red-600">
        Card templates are not configured.
      </div>
    );
  }

  const mainImage =
    selectedTemplate.images[activeImageIndex] ??
    selectedTemplate.images[0];

  // pricing logic for 4x6 based on quantity
  const { unitPrice, totalPrice } = useMemo(() => {
    let unit = 0;

    if (quantity === 1) unit = 5.99;
    else if (quantity === 3) unit = 5.49;
    else if (quantity === 5) unit = 4.99;

    return {
      unitPrice: unit,
      totalPrice: unit * quantity,
    };
  }, [quantity]);

  const handleQuantityChange = (value: string) => {
    const q = Number(value) as 1 | 3 | 5;
    if (q === 1 || q === 3 || q === 5) {
      setQuantity(q);
    }
  };

  const handleAddToCart = () => {
    addItem(selectedTemplate.id, quantity);
  };

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        <div className="grid gap-8 sm:grid-cols-[1.1fr,1fr]">
          {/* LEFT SIDE — IMAGE CAROUSEL */}
          <div>
            {/* Main image */}
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800">
              <Image
                src={mainImage}
                alt=""
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </div>

            {/* Thumbnails */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              {selectedTemplate.images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative aspect-[4/5] overflow-hidden rounded-lg border ${
                    activeImageIndex === idx
                      ? "border-zinc-900 dark:border-zinc-100"
                      : "border-zinc-300 dark:border-zinc-700"
                  }`}
                >
                  <Image
                    src={img}
                    alt=""
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT SIDE — DETAILS / CONTROLS */}
          <div className="flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Classic GiftLink card
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                A physical greeting card with a smart QR code inside. Guests
                load a cash gift online and the couple scans the same code at
                the wedding to claim it.
              </p>
            </div>

            <div className="space-y-4">
              {/* Design / size selector (currently only 4x6) */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Card size
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => {
                    setSelectedTemplateId(e.target.value);
                    setActiveImageIndex(0);
                  }}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                >
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.size}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity selector 1, 3, 5 */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Quantity
                </label>
                <select
                  value={quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  className="w-28 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                >
                  <option value={1}>1 card</option>
                  <option value={3}>3 cards</option>
                  <option value={5}>5 cards</option>
                </select>
              </div>
            </div>

            {/* Bottom row: add to cart left, price right */}
            <div className="mt-2 flex flex-col-reverse items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleAddToCart}
                className="w-full rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900 sm:w-auto"
              >
                Add to cart
              </button>

              <div className="text-right">
                <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {totalPrice.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                  })}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {unitPrice.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                  })}{" "}
                  per card · plus S&H
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
