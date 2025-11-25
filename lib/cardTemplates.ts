// lib/cardTemplates.ts

export type CardSize = "4x6";

export type Occasion = "wedding" | "birthday";

export type CardTemplate = {
  id: string;
  name: string;
  size: CardSize;
  sku: string;
  occasion: Occasion;
  // legacy single price
  stripePriceId: string;
  printfulSyncVariantId: number;
  printfulShippingVariantId?: number;
  images: string[];
  stripePrices: { 1: string; 3: string; 5: string };
};

export const CARD_TEMPLATES: CardTemplate[] = [
  {
    id: "card1_4x6",
    name: "To Have and To Hold",
    size: "4x6",
    sku: "CARD1_4X6",
    occasion: "wedding",
    stripePriceId: "price_1SWJUg0GCf06HHw3tC7uJML1",
    printfulSyncVariantId: 5064628437,
    printfulShippingVariantId: 14457,
    images: [
      "/Card1Images/Card1Mockup1.png",
      "/Card1Images/Card1Mockup2.png",
      "/Card1Images/Card1Mockup3.png",
    ],
    stripePrices: {
      1: "price_1SWJUg0GCf06HHw3tC7uJML1",
      3: "price_1SWJWS0GCf06HHw3pmJKo2jj",
      5: "price_1SWJX50GCf06HHw3L2rhHwsD",
    },
  },

  {
    id: "fizzy_bubbly_4x6",
    name: "Fizzy Bubbly",
    size: "4x6",
    sku: "FIZZYBUBBLY_4X6",
    occasion: "wedding",
    stripePriceId: "price_1SWJUg0GCf06HHw3tC7uJML1",
    printfulSyncVariantId: 5071152160,
    printfulShippingVariantId: 14457,
    images: [
      "/FizzyBubblyImages/FizzyMockup1.png",
      "/FizzyBubblyImages/FizzyMockup2.png",
      "/FizzyBubblyImages/FizzyMockup3.png",
    ],
    stripePrices: {
      1: "price_1SWJUg0GCf06HHw3tC7uJML1",
      3: "price_1SWJWS0GCf06HHw3pmJKo2jj",
      5: "price_1SWJX50GCf06HHw3L2rhHwsD",
    },
  },

  // New birthday card template
  {
    id: "another_trip_around_the_sun_4x6",
    name: "Another Trip Around The Sun",
    size: "4x6",
    sku: "ANOTHER_TRIP_AROUND_SUN_4X6",
    occasion: "birthday",
    stripePriceId: "price_1SWJUg0GCf06HHw3tC7uJML1",
    // You can update this to the real birthday sync variant id
    printfulSyncVariantId: 5072394027,
    printfulShippingVariantId: 14457,
    images: [
      "/AnotherTripAroundTheSunImages/AnotherTripAroundTheSunImagesMockup1.png",
      "/AnotherTripAroundTheSunImages/AnotherTripAroundTheSunImagesMockup2.png",
      "/AnotherTripAroundTheSunImages/AnotherTripAroundTheSunImagesMockup3.png",
    ],
    stripePrices: {
      1: "price_1SWJUg0GCf06HHw3tC7uJML1",
      3: "price_1SWJWS0GCf06HHw3pmJKo2jj",
      5: "price_1SWJX50GCf06HHw3L2rhHwsD",
    },
  },
];

export function getCardTemplateById(id: string): CardTemplate | undefined {
  return CARD_TEMPLATES.find((t) => t.id === id);
}
