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
  id: "floral_wedding_4x6",
  name: "Floral Wedding",
  size: "4x6",
  sku: "FLORAL_WEDDING_4X6",
  occasion: "wedding",
  stripePriceId: "price_1SWJUg0GCf06HHw3tC7uJML1",
  printfulSyncVariantId: 5079482998,
  printfulShippingVariantId: 14457,
  images: [
    "/FloralWeddingImages/FloralWeddingMockup1.png",
    "/FloralWeddingImages/FloralWeddingMockup2.png",
    "/FloralWeddingImages/FloralWeddingMockup3.png",
  ],
  stripePrices: {
    1: "price_1SWJUg0GCf06HHw3tC7uJML1",
    3: "price_1SWJWS0GCf06HHw3pmJKo2jj",
    5: "price_1SWJX50GCf06HHw3L2rhHwsD",
  },
},


{
  id: "wedding_poem_4x6",
  name: "Wedding Poem",
  size: "4x6",
  sku: "WEDDING_POEM_4X6",
  occasion: "wedding",
  stripePriceId: "price_1SWJUg0GCf06HHw3tC7uJML1",
  printfulSyncVariantId: 5079297309,
  printfulShippingVariantId: 14457,
  images: [
    "/WeddingPoemImages/WeddingPoemMockup1.png",
    "/WeddingPoemImages/WeddingPoemMockup2.png",
    "/WeddingPoemImages/WeddingPoemMockup3.png"
  ],
  stripePrices: {
    1: "price_1SWJUg0GCf06HHw3tC7uJML1",
    3: "price_1SWJWS0GCf06HHw3pmJKo2jj",
    5: "price_1SWJX50GCf06HHw3L2rhHwsD"
  },
},


{
  id: "watercolor_wedding_4x6",
  name: "Watercolor Wedding",
  size: "4x6",
  sku: "WATERCOLOR_WEDDING_4X6",
  occasion: "wedding",
  stripePriceId: "price_1SWJUg0GCf06HHw3tC7uJML1",
  printfulSyncVariantId: 5079282339,
  printfulShippingVariantId: 14457,
  images: [
    "/WatercolorWeddingImages/WatercolorWeddingMockup1.png",
    "/WatercolorWeddingImages/WatercolorWeddingMockup2.png",
    "/WatercolorWeddingImages/WatercolorWeddingMockup3.png",
  ],
  stripePrices: {
    1: "price_1SWJUg0GCf06HHw3tC7uJML1",
    3: "price_1SWJWS0GCf06HHw3pmJKo2jj",
    5: "price_1SWJX50GCf06HHw3L2rhHwsD",
  },
},

{
  id: "colorful_wedding_4x6",
  name: "Colorful Wedding",
  size: "4x6",
  sku: "COLORFUL_WEDDING_4X6",
  occasion: "wedding",
  stripePriceId: "price_1SWJUg0GCf06HHw3tC7uJML1",
  printfulSyncVariantId: 5079444047,
  printfulShippingVariantId: 14457,
  images: [
    "/ColorfulWeddingImages/ColorfulWeddingMockup1.png",
    "/ColorfulWeddingImages/ColorfulWeddingMockup2.png",
    "/ColorfulWeddingImages/ColorfulWeddingMockup3.png"
  ],
  stripePrices: {
    1: "price_1SWJUg0GCf06HHw3tC7uJML1",
    3: "price_1SWJWS0GCf06HHw3pmJKo2jj",
    5: "price_1SWJX50GCf06HHw3L2rhHwsD"
  },
},

{
  id: "mil_spec_wedding_4x6",
  name: "Mil Spec Wedding",
  size: "4x6",
  sku: "MIL_SPEC_WEDDING_4X6", // or "6929EE0B87683" if you prefer matching Printful
  occasion: "wedding",
  stripePriceId: "price_1SWJUg0GCf06HHw3tC7uJML1",
  printfulSyncVariantId: 5079316169,
  printfulShippingVariantId: 14457,
  images: [
    "/MilSpecWeddingImages/MilSpecWeddingMockup1.png",
    "/MilSpecWeddingImages/MilSpecWeddingMockup2.png",
    "/MilSpecWeddingImages/MilSpecWeddingMockup3.png",
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
  id: "black_gold_birthday_4x6",
  name: "Black and Gold Birthday",
  size: "4x6",
  sku: "6929E156244D7",
  occasion: "birthday",
  stripePriceId: "price_1SWJUg0GCf06HHw3tC7uJML1",
  printfulSyncVariantId: 5079273568,
  printfulShippingVariantId: 14457,
  images: [
    "/BlackGoldBirthdayImages/BlackGoldBirthdayMockup1.png",
    "/BlackGoldBirthdayImages/BlackGoldBirthdayMockup2.png",
    "/BlackGoldBirthdayImages/BlackGoldBirthdayMockup3.png" // optional if you only have 2
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
