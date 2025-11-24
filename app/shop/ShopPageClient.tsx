"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { CARD_TEMPLATES, CardTemplate } from "@/lib/cardTemplates";
import { useCart } from "../providers/CartProvider";

export default function ShopPageClient() {
  // Debug: log templates to browser console
  console.log(
    "[ShopPage] templates",
    CARD_TEMPLATES.length,
    CARD_TEMPLATES.map((t) => t.id),
  );

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        <div className="mb-6 space-y-2">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Choose your GiftLink card design
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Pick a card style below, choose your quantity, and add it to your
            cart. All cards are four by six greeting cards with a smart QR code
            printed inside.
          </p>
        </div>

        {/* Debug info: how many templates and which ids are loaded */}
        <p className="mb-2 text-xs text-zinc-500">
          Debug templates: {CARD_TEMPLATES.length} (
          {CARD_TEMPLATES.map((t) => t.id).join(", ")})
        </p>

        {/* Product grid: one tile per card template */}
        <div className="grid gap-8 md:grid-cols-2">
          {CARD_TEMPLATES.map((template) => (
            <ProductCard key={template.id} template={template} />
          ))}
        </div>
      </section>
    </main>
  );
}

function ProductCard({ template }: { template: CardTemplate }) {
  const { addItem } = useCart();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState<1 | 3 | 5>(1);

  const mainImage = template.images[activeImageIndex] ?? template.images[0];

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
    addItem(template.id, quantity);
  };

  if (!template) {
    return (
      <div className="text-sm text-red-600">
        Card template configuration error.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {/* Images */}
      <div>
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-800">
          {mainImage && (
            <Image
              src={mainImage}
              alt={template.name}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          )}
        </div>

        {template.images.length > 1 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {template.images.map((img, idx) => (
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
                <Image src={img} alt="" fill className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Details and controls */}
      <div className="flex flex-1 flex-col justify-between gap-4">
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {template.name}
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Four by six greeting card with a printed QR code inside. Guests
            load a cash gift online and the couple scans the same code to claim
            it.
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            Size: {template.size.toUpperCase()}
          </p>
        </div>

        <div className="space-y-3">
          {/* Quantity selector */}
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

          {/* Price + add to cart */}
          <div className="mt-1 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
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
    </div>
  );
}
