"use client";

import Image from "next/image";
import { CARD_TEMPLATES } from "@/lib/cardTemplates";
import { useCart } from "../providers/CartProvider";

export default function ShopPageClient() {
  const { addItem } = useCart();

  const handleAddToCart = (templateId: string) => {
    addItem(templateId, 1);
  };

  const visibleTemplates = CARD_TEMPLATES;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8">
      <section className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        {visibleTemplates.map((template) => (
          <article
            key={template.id}
            className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
              <Image
                src={template.previewImage}
                alt={template.name}
                fill
                className="object-cover"
              />
            </div>

            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {template.name}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Size {template.size}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleAddToCart(template.id)}
              className="mt-auto inline-flex items-center justify-center rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Add to cart
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}
