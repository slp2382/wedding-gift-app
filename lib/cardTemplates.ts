// lib/cardTemplates.ts

export type CardSize = "4x6" | "5x7";

export type CardTemplate = {
  id: string;                // internal id like "card1_4x6"
  name: string;              // display name
  size: CardSize;
  sku: string;               // stable identifier for Printful and admin
  stripePriceId: string;     // Stripe price id for this template
  printfulSyncVariantId: number; // Printful sync variant id
  previewImage: string;      // path to preview image under public
};

export const CARD_TEMPLATES: CardTemplate[] = [
  {
    id: "card1_4x6",
    name: "Classic GiftLink card four by six",
    size: "4x6",
    sku: "CARD1_4X6",
    stripePriceId: process.env.STRIPE_PRICE_CARD1_4X6 ?? "",
    printfulSyncVariantId: 5064628437, // your existing working variant
    previewImage: "/Card1Images/card1_4x6_front.png",
  },
  {
    id: "card1_5x7",
    name: "Classic GiftLink card five by seven",
    size: "5x7",
    sku: "CARD1_5X7",
    stripePriceId: process.env.STRIPE_PRICE_CARD1_5X7 ?? "",
    printfulSyncVariantId: 5064628437, // placeholder until you set a real 5x7 variant
    previewImage: "/Card1Images/card1_5x7_front.png",
  },
];

export function getCardTemplateById(id: string): CardTemplate | undefined {
  return CARD_TEMPLATES.find((t) => t.id === id);
}
