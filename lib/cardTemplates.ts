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
  printfulCoverFileId: number;
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
    stripePriceId: "price_1SWJVN0btTMST7LgTBriW2Am", // legacy single price
    printfulSyncVariantId: 5079220284,
    printfulShippingVariantId: 14457,
    printfulCoverFileId: 909170418,
    images: [
      "/LoveandHappinessImages/LoveandHappinessMockup1.png",
      "/LoveandHappinessImages/LoveandHappinessMockup2.png",
      "/LoveandHappinessImages/LoveandHappinessMockup3.png",
    ],
    stripePrices: {
      1: "price_1SWJVN0btTMST7LgTBriW2Am",
      3: "price_1SWJWc0btTMST7LgunEmJ5p6",
      5: "price_1SWJX90btTMST7LgosTE6QSI",
    },
  },

  {
    id: "card1_4x6",
    name: "To Have and To Hold",
    size: "4x6",
    sku: "CARD1_4X6",
    occasion: "wedding",
    stripePriceId: "price_1SWJVN0btTMST7LgTBriW2Am",
    printfulSyncVariantId: 5064628437,
    printfulShippingVariantId: 14457,
    printfulCoverFileId: 918073326,
    images: [
      "/Card1Images/Card1Mockup1.png",
      "/Card1Images/Card1Mockup2.png",
      "/Card1Images/Card1Mockup3.png",
    ],
    stripePrices: {
      1: "price_1SWJVN0btTMST7LgTBriW2Am",
      3: "price_1SWJWc0btTMST7LgunEmJ5p6",
      5: "price_1SWJX90btTMST7LgosTE6QSI",
    },
  },

  {
    id: "love_birds_4x6",
    name: "Love Birds",
    size: "4x6",
    sku: "LOVE_BIRDS_4X6",
    occasion: "wedding",
    stripePriceId: "price_1SWJVN0btTMST7LgTBriW2Am",
    printfulSyncVariantId: 5078065456,
    printfulShippingVariantId: 14457,
    printfulCoverFileId: 908804108,
    images: [
      "/LoveBirdsImages/LoveBirdsMockup1.png",
      "/LoveBirdsImages/LoveBirdsMockup2.png",
      "/LoveBirdsImages/LoveBirdsMockup3.png",
    ],
    stripePrices: {
      1: "price_1SWJVN0btTMST7LgTBriW2Am",
      3: "price_1SWJWc0btTMST7LgunEmJ5p6",
      5: "price_1SWJX90btTMST7LgosTE6QSI",
    },
  },

  {
    id: "floral_wedding_4x6",
    name: "Floral Wedding",
    size: "4x6",
    sku: "FLORAL_WEDDING_4X6",
    occasion: "wedding",
    stripePriceId: "price_1SWJVN0btTMST7LgTBriW2Am",
    printfulSyncVariantId: 5079482998,
    printfulShippingVariantId: 14457,
    printfulCoverFileId: 909328917,
    images: [
      "/FloralWeddingImages/FloralWeddingMockup1.png",
      "/FloralWeddingImages/FloralWeddingMockup2.png",
      "/FloralWeddingImages/FloralWeddingMockup3.png",
    ],
    stripePrices: {
      1: "price_1SWJVN0btTMST7LgTBriW2Am",
      3: "price_1SWJWc0btTMST7LgunEmJ5p6",
      5: "price_1SWJX90btTMST7LgosTE6QSI",
    },
  },

  {
    id: "wedding_poem_4x6",
    name: "Wedding Poem",
    size: "4x6",
    sku: "WEDDING_POEM_4X6",
    occasion: "wedding",
    stripePriceId: "price_1SWJVN0btTMST7LgTBriW2Am",
    printfulSyncVariantId: 5079297309,
    printfulShippingVariantId: 14457,
    printfulCoverFileId: 918080160,
    images: [
      "/WeddingPoemImages/WeddingPoemMockup1.png",
      "/WeddingPoemImages/WeddingPoemMockup2.png",
      "/WeddingPoemImages/WeddingPoemMockup3.png",
    ],
    stripePrices: {
      1: "price_1SWJVN0btTMST7LgTBriW2Am",
      3: "price_1SWJWc0btTMST7LgunEmJ5p6",
      5: "price_1SWJX90btTMST7LgosTE6QSI",
    },
  },

  {
    id: "watercolor_wedding_4x6",
    name: "Watercolor Wedding",
    size: "4x6",
    sku: "WATERCOLOR_WEDDING_4X6",
    occasion: "wedding",
    stripePriceId: "price_1SWJVN0btTMST7LgTBriW2Am",
    printfulSyncVariantId: 5079282339,
    printfulShippingVariantId: 14457,
    printfulCoverFileId: 918047142,
    images: [
      "/WatercolorWeddingImages/WatercolorWeddingMockup1.png",
      "/WatercolorWeddingImages/WatercolorWeddingMockup2.png",
      "/WatercolorWeddingImages/WatercolorWeddingMockup3.png",
    ],
    stripePrices: {
      1: "price_1SWJVN0btTMST7LgTBriW2Am",
      3: "price_1SWJWc0btTMST7LgunEmJ5p6",
      5: "price_1SWJX90btTMST7LgosTE6QSI",
    },
  },

  {
    id: "colorful_wedding_4x6",
    name: "Colorful Wedding",
    size: "4x6",
    sku: "COLORFUL_WEDDING_4X6",
    occasion: "wedding",
    stripePriceId: "price_1SWJVN0btTMST7LgTBriW2Am",
    printfulSyncVariantId: 5079444047,
    printfulShippingVariantId: 14457,
    printfulCoverFileId: 909319453,
    images: [
      "/ColorfulWeddingImages/ColorfulWeddingMockup1.png",
      "/ColorfulWeddingImages/ColorfulWeddingMockup2.png",
      "/ColorfulWeddingImages/ColorfulWeddingMockup3.png",
    ],
    stripePrices: {
      1: "price_1SWJVN0btTMST7LgTBriW2Am",
      3: "price_1SWJWc0btTMST7LgunEmJ5p6",
      5: "price_1SWJX90btTMST7LgosTE6QSI",
    },
  },

  {
    id: "fizzy_bubbly_4x6",
    name: "Fizzy Bubbly",
    size: "4x6",
    sku: "FIZZYBUBBLY_4X6",
    occasion: "wedding",
    stripePriceId: "price_1SWJVN0btTMST7LgTBriW2Am",
    printfulSyncVariantId: 5071152160,
    printfulShippingVariantId: 14457,
    printfulCoverFileId: 906317612,
    images: [
      "/FizzyBubblyImages/FizzyMockup1.png",
      "/FizzyBubblyImages/FizzyMockup2.png",
      "/FizzyBubblyImages/FizzyMockup3.png",
    ],
    stripePrices: {
      1: "price_1SWJVN0btTMST7LgTBriW2Am",
      3: "price_1SWJWc0btTMST7LgunEmJ5p6",
      5: "price_1SWJX90btTMST7LgosTE6QSI",
    },
  },

  {
    id: "confetti_birthday_4x6",
    name: "Confetti Birthday",
    size: "4x6",
    sku: "CONFETTI_BIRTHDAY_4X6",
    occasion: "birthday",
    stripePriceId: "price_1SWJVN0btTMST7LgTBriW2Am",
    printfulSyncVariantId: 5078093148,
    printfulShippingVariantId: 14457,
    printfulCoverFileId: 908816971,
    images: [
      "/ConfettiBirthdayImages/ConfettiBirthdayMockup1.png",
      "/ConfettiBirthdayImages/ConfettiBirthdayMockup2.png",
      "/ConfettiBirthdayImages/ConfettiBirthdayMockup3.png",
    ],
    stripePrices: {
      1: "price_1SWJVN0btTMST7LgTBriW2Am",
      3: "price_1SWJWc0btTMST7LgunEmJ5p6",
      5: "price_1SWJX90btTMST7LgosTE6QSI",
    },
  },

  {
    id: "pink_birthday_4x6",
    name: "Pink Birthday!",
    size: "4x6",
    sku: "PINK_BIRTHDAY_4X6",
    occasion: "birthday",
    stripePriceId: "price_1SWJVN0btTMST7LgTBriW2Am",
    printfulSyncVariantId: 5079262069,
    printfulShippingVariantId: 14457,
    printfulCoverFileId: 918071119,
    images: [
      "/PinkBirthdayImages/PinkBirthdayMockup1.png",
      "/PinkBirthdayImages/PinkBirthdayMockup2.png",
      "/PinkBirthdayImages/PinkBirthdayMockup3.png",
    ],
    stripePrices: {
      1: "price_1SWJVN0btTMST7LgTBriW2Am",
      3: "price_1SWJWc0btTMST7LgunEmJ5p6",
      5: "price_1SWJX90btTMST7LgosTE6QSI",
    },
  },

  {
    id: "black_gold_birthday_4x6",
    name: "Black and Gold Birthday",
    size: "4x6",
    sku: "6929E156244D7",
    occasion: "birthday",
    stripePriceId: "price_1SWJVN0btTMST7LgTBriW2Am",
    printfulSyncVariantId: 5079273568,
    printfulShippingVariantId: 14457,
    printfulCoverFileId: 918069908,
    images: [
      "/BlackGoldBirthdayImages/BlackGoldBirthdayMockup1.png",
      "/BlackGoldBirthdayImages/BlackGoldBirthdayMockup2.png",
      "/BlackGoldBirthdayImages/BlackGoldBirthdayMockup3.png", // optional if you only have 2
    ],
    stripePrices: {
      1: "price_1SWJVN0btTMST7LgTBriW2Am",
      3: "price_1SWJWc0btTMST7LgunEmJ5p6",
      5: "price_1SWJX90btTMST7LgosTE6QSI",
    },
  },

  {
    id: "another_trip_around_the_sun_4x6",
    name: "Another Trip Around The Sun",
    size: "4x6",
    sku: "ANOTHER_TRIP_AROUND_SUN_4X6",
    occasion: "birthday",
    stripePriceId: "price_1SWJVN0btTMST7LgTBriW2Am",
    printfulSyncVariantId: 5072394027,
    printfulShippingVariantId: 14457,
    printfulCoverFileId: 918082054,
    images: [
      "/AnotherTripAroundTheSunImages/AnotherTripAroundTheSunImagesMockup1.png",
      "/AnotherTripAroundTheSunImages/AnotherTripAroundTheSunImagesMockup2.png",
      "/AnotherTripAroundTheSunImages/AnotherTripAroundTheSunImagesMockup3.png",
    ],
    stripePrices: {
      1: "price_1SWJVN0btTMST7LgTBriW2Am",
      3: "price_1SWJWc0btTMST7LgunEmJ5p6",
      5: "price_1SWJX90btTMST7LgosTE6QSI",
    },
  },
];

export function getCardTemplateById(id: string): CardTemplate | undefined {
  return CARD_TEMPLATES.find((t) => t.id === id);
}
