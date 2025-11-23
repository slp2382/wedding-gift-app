// lib/cardTemplates.ts

export type CardSize = "4x6";

export type CardTemplate = {
  id: string;
  name: string;
  size: CardSize;
  sku: string;
  // legacy single price, we will mostly use stripePrices now
  stripePriceId: string;
  printfulSyncVariantId: number;
  images: string[];
  stripePrices: { 1: string; 3: string; 5: string };
};

export const CARD_TEMPLATES: CardTemplate[] = [
  {
    id: "card1_4x6",
    name: "Classic GiftLink card four by six",
    size: "4x6",
    sku: "CARD1_4X6",
    // map to the one card price for now
    stripePriceId: "price_1SWJUg0GCf06HHw3tC7uJML1",
    // 4x6 Printful sync variant (unchanged)
    printfulSyncVariantId: 5064628437,
    images: [
      "/Card1Images/Card1Mockup1.png",
      "/Card1Images/Card1Mockup2.png",
      "/Card1Images/Card1Mockup3.png",
    ],
    stripePrices: {
      1: "price_1SWJUg0GCf06HHw3tC7uJML1", // 4x6 qty one 5.99
      3: "price_1SWJWS0GCf06HHw3pmJKo2jj", // 4x6 qty three 16.47
      5: "price_1SWJX50GCf06HHw3L2rhHwsD", // 4x6 qty five 24.95
    },
  },
];

export function getCardTemplateById(id: string): CardTemplate | undefined {
  return CARD_TEMPLATES.find((t) => t.id === id);
}
