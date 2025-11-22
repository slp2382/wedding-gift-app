// lib/cardTemplates.ts

export type CardSize = "4x6" | "5x7";

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
  {
    id: "card1_5x7",
    name: "Classic GiftLink card five by seven",
    size: "5x7",
    sku: "CARD1_5X7",
    stripePriceId: "price_1SWJXi0GCf06HHw3rwJO9xlB",
    printfulSyncVariantId: 5064628437,
    images: [
      "/Card1Images/Card1Mockup1.png",
      "/Card1Images/Card1Mockup2.png",
      "/Card1Images/Card1Mockup3.png",
    ],
    stripePrices: {
      1: "price_1SWJXi0GCf06HHw3rwJO9xlB", // 5x7 qty one 6.99
      3: "price_1SWJYE0GCf06HHw3Q8dFxKjY", // 5x7 qty three 19.47
      5: "price_1SWJYu0GCf06HHw3moiAr0OP", // 5x7 qty five 29.95
    },
  },
];

export function getCardTemplateById(id: string): CardTemplate | undefined {
  return CARD_TEMPLATES.find((t) => t.id === id);
}
