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
  id: "love_and_happiness_4x6",
  name: "Love and Happiness",
  size: "4x6",
  sku: "LOVE_AND_HAPPINESS_4X6",
  occasion: "wedding",
  stripePriceId: "price_1SWJUg0GCf06HHw3tC7uJML1", // legacy single price
  printfulSyncVariantId: 5079220284,
  printfulShippingVariantId: 14457,
  images: [
    "/LoveandHappinessImages/LoveandHappinessMockup1.png",
    "/LoveandHappinessImages/LoveandHappinessMockup2.png",
    "/LoveandHappinessImages/LoveandHappinessMockup3.png"
  ],
  stripePrices: {
    1: "price_1SWJUg0GCf06HHw3tC7uJML1",
    3: "price_1SWJWS0GCf06HHw3pmJKo2jj",
    5: "price_1SWJX50GCf06HHw3L2rhHwsD"
  },
},




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
    id: "love_birds_4x6",
    name: "Love Birds",
    size: "4x6",
    sku: "LOVE_BIRDS_4X6",
    occasion: "wedding",
    stripePriceId: "price_1SWJUg0GCf06HHw3tC7uJML1",
    printfulSyncVariantId: 5078065456,
    printfulShippingVariantId: 14457,
    images: [
      "/LoveBirdsImages/LoveBirdsMockup1.png",
      "/LoveBirdsImages/LoveBirdsMockup2.png",
      "/LoveBirdsImages/LoveBirdsMockup3.png",
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

  {
  id: "confetti_birthday_4x6",
  name: "Confetti Birthday",
  size: "4x6",
  sku: "CONFETTI_BIRTHDAY_4X6",
  occasion: "birthday",
  stripePriceId: "price_1SWJUg0GCf06HHw3tC7uJML1",
  printfulSyncVariantId: 5078093148,
  printfulShippingVariantId: 14457,
  images: [
    "/ConfettiBirthdayImages/ConfettiBirthdayMockup1.png",
    "/ConfettiBirthdayImages/ConfettiBirthdayMockup2.png",
    "/ConfettiBirthdayImages/ConfettiBirthdayMockup3.png",
  ],
  stripePrices: {
    1: "price_1SWJUg0GCf06HHw3tC7uJML1",
    3: "price_1SWJWS0GCf06HHw3pmJKo2jj",
    5: "price_1SWJX50GCf06HHw3L2rhHwsD",
  },
},

{
  id: "pink_birthday_4x6",
  name: "Pink Birthday!",
  size: "4x6",
  sku: "PINK_BIRTHDAY_4X6",
  occasion: "birthday",
  stripePriceId: "price_1SWJUg0GCf06HHw3tC7uJML1",
  printfulSyncVariantId: 5079262069,
  printfulShippingVariantId: 14457,
  images: [
    "/PinkBirthdayImages/PinkBirthdayMockup1.png",
    "/PinkBirthdayImages/PinkBirthdayMockup2.png",
    "/PinkBirthdayImages/PinkBirthdayMockup3.png"
  ],
  stripePrices: {
    1: "price_1SWJUg0GCf06HHw3tC7uJML1",
    3: "price_1SWJWS0GCf06HHw3pmJKo2jj",
    5: "price_1SWJX50GCf06HHw3L2rhHwsD"
  },
},


  {
    id: "another_trip_around_the_sun_4x6",
    name: "Another Trip Around The Sun",
    size: "4x6",
    sku: "ANOTHER_TRIP_AROUND_SUN_4X6",
    occasion: "birthday",
    stripePriceId: "price_1SWJUg0GCf06HHw3tC7uJML1",
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
