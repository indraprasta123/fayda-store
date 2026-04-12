const { analyzeImage } = require("../services/aiService");
const extractKeywords = require("../utils/extractKeyword");
const { Product, Category, OrderItem, Rating } = require("../models");
const { Op, fn, col } = require("sequelize");

const RECOMMENDATION_KEYWORDS = [
  "rekomendasi",
  "rekomendasikan",
  "saran",
  "sarankan",
  "recommend",
  "rekomen",
];

const POPULAR_KEYWORDS = [
  "populer",
  "terlaris",
  "laris",
  "best seller",
  "ramai",
  "favorit",
  "banyak dibeli",
];

const TASTY_KEYWORDS = ["enak", "lezat", "gurih", "mantap", "nikmat"];

const GENERIC_RECOMMENDATION_TERMS = new Set([
  "produk",
  "barang",
  "rekomendasi",
  "rekomendasikan",
  "saran",
  "sarankan",
  "populer",
  "terlaris",
  "laris",
  "enak",
]);

const RECOMMENDATION_FILLER_TERMS = new Set([
  "apa",
  "aja",
  "paling",
  "dong",
  "nih",
  "please",
  "yang",
  "cocok",
  "buat",
  "untuk",
  "mau",
  "aku",
  "saya",
  "tolong",
]);

const CATEGORY_HINT_MAP = {
  permen: ["permen", "candy", "gummy", "lolipop", "mint", "karamel"],
  minuman: ["minuman", "drink", "jus", "teh", "kopi", "soda", "susu"],
  snack: ["snack", "camilan", "keripik", "kripik", "chips", "wafer"],
  biskuit: ["biskuit", "biscuit", "cookies", "cracker"],
  cokelat: ["cokelat", "coklat", "chocolate"],
};

const normalizeText = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase();

const containsAnyKeyword = (text, keywords = []) => {
  const normalized = normalizeText(text);
  return keywords.some((keyword) => normalized.includes(keyword));
};

const detectRecommendationIntent = (query = "") => {
  const normalized = normalizeText(query);
  return {
    isRecommendation:
      containsAnyKeyword(normalized, RECOMMENDATION_KEYWORDS) ||
      containsAnyKeyword(normalized, POPULAR_KEYWORDS) ||
      containsAnyKeyword(normalized, TASTY_KEYWORDS),
    wantsPopular: containsAnyKeyword(normalized, POPULAR_KEYWORDS),
    wantsTasty: containsAnyKeyword(normalized, TASTY_KEYWORDS),
  };
};

const getCategoryTokens = ({ categoryHint = "", keywords = [] }) => {
  const normalizedHint = normalizeText(categoryHint);
  if (normalizedHint && CATEGORY_HINT_MAP[normalizedHint]) {
    return CATEGORY_HINT_MAP[normalizedHint];
  }

  const allKeywords = keywords.map(normalizeText).filter(Boolean);

  for (const tokenGroup of Object.values(CATEGORY_HINT_MAP)) {
    if (tokenGroup.some((token) => allKeywords.includes(token))) {
      return tokenGroup;
    }
  }

  return [];
};

const hasCategorySignal = (product, categoryTokens = []) => {
  if (!categoryTokens.length) return true;

  const categoryName = normalizeText(product?.category?.name || "");
  const productName = normalizeText(product?.name || "");
  const caption = normalizeText(product?.ai_caption || "");
  const tags = Array.isArray(product?.ai_tags)
    ? product.ai_tags.map(normalizeText)
    : [];

  return categoryTokens.some(
    (token) =>
      categoryName.includes(token) ||
      productName.includes(token) ||
      caption.includes(token) ||
      tags.some((tag) => tag.includes(token)),
  );
};

const rankProducts = ({
  products = [],
  categoryTokens = [],
  uniqueKeywords = [],
  salesMap,
  ratingMap,
  intent,
}) => {
  const keywordSet = new Set(uniqueKeywords.map(normalizeText));

  const scored = products.map((product) => {
    const productJson = product.toJSON ? product.toJSON() : product;
    const name = normalizeText(productJson?.name || "");
    const caption = normalizeText(productJson?.ai_caption || "");
    const tags = Array.isArray(productJson?.ai_tags)
      ? productJson.ai_tags.map(normalizeText)
      : [];

    const soldCount = Number(salesMap.get(Number(productJson.id)) || 0);
    const ratingInfo = ratingMap.get(Number(productJson.id)) || {
      averageRating: 0,
      totalRatings: 0,
    };

    let relevanceScore = 0;
    for (const keyword of keywordSet) {
      if (!keyword) continue;
      if (name.includes(keyword)) relevanceScore += 6;
      if (caption.includes(keyword)) relevanceScore += 3;
      if (tags.some((tag) => tag.includes(keyword))) relevanceScore += 4;
    }

    if (hasCategorySignal(productJson, categoryTokens)) {
      relevanceScore += 12;
    }

    const qualityScore =
      Number(ratingInfo.averageRating || 0) * 12 +
      Math.min(Number(ratingInfo.totalRatings || 0), 50) * 0.8;
    const popularityScore = Math.min(soldCount, 500) * 0.6;

    let finalScore =
      relevanceScore + qualityScore * 0.2 + popularityScore * 0.2;

    if (intent?.isRecommendation) {
      if (intent.wantsPopular && intent.wantsTasty) {
        finalScore = popularityScore + qualityScore + relevanceScore * 0.3;
      } else if (intent.wantsPopular) {
        finalScore =
          popularityScore * 1.25 + qualityScore * 0.65 + relevanceScore * 0.25;
      } else if (intent.wantsTasty) {
        finalScore =
          qualityScore * 1.25 + popularityScore * 0.65 + relevanceScore * 0.25;
      } else {
        finalScore = qualityScore + popularityScore + relevanceScore * 0.25;
      }
    }

    return {
      ...productJson,
      soldCount,
      averageRating: Number(ratingInfo.averageRating || 0),
      totalRatings: Number(ratingInfo.totalRatings || 0),
      _score: finalScore,
    };
  });

  return scored.sort((a, b) => b._score - a._score || b.id - a.id);
};

const findProductsFromAiSignals = async ({
  productName = "",
  rawText = "",
  aiKeywords = [],
  categoryHint = "",
  strictCategory = false,
  recommendationMode = false,
  intent,
}) => {
  const fallbackKeywords = extractKeywords(rawText || "");
  const keywords = [...(aiKeywords || []), ...fallbackKeywords]
    .map((word) =>
      String(word || "")
        .trim()
        .toLowerCase(),
    )
    .filter((word) => word.length > 2);

  const uniqueKeywords = [...new Set(keywords)].slice(0, 12);
  const searchableKeywords = recommendationMode
    ? uniqueKeywords.filter(
        (word) =>
          !GENERIC_RECOMMENDATION_TERMS.has(word) &&
          !RECOMMENDATION_FILLER_TERMS.has(word),
      )
    : uniqueKeywords;

  const categoryTokens = getCategoryTokens({
    categoryHint,
    keywords: uniqueKeywords,
  });

  const queryTerms = [productName, ...searchableKeywords]
    .map(normalizeText)
    .filter(Boolean);

  const whereOr = [
    ...queryTerms.map((term) => ({
      name: {
        [Op.iLike]: `%${term}%`,
      },
    })),
    ...queryTerms.map((term) => ({
      ai_caption: {
        [Op.iLike]: `%${term}%`,
      },
    })),
    ...queryTerms.map((term) => ({
      "$category.name$": {
        [Op.iLike]: `%${term}%`,
      },
    })),
  ];

  if (searchableKeywords.length) {
    whereOr.push({
      ai_tags: {
        [Op.overlap]: searchableKeywords,
      },
    });
  }

  const findAllOptions = {
    where:
      recommendationMode && whereOr.length === 0
        ? {}
        : {
            [Op.or]: whereOr.length
              ? whereOr
              : [
                  {
                    name: {
                      [Op.iLike]: `%${productName || ""}%`,
                    },
                  },
                ],
          },
    include: [{ model: Category, as: "category", attributes: ["id", "name"] }],
    subQuery: false,
    limit: recommendationMode ? 40 : 24,
  };

  let products = await Product.findAll(findAllOptions);

  if (recommendationMode && !products.length) {
    products = await Product.findAll({
      where: {},
      include: [
        { model: Category, as: "category", attributes: ["id", "name"] },
      ],
      subQuery: false,
      limit: 40,
    });
  }

  const productsByCategory = categoryTokens.length
    ? products.filter((product) => hasCategorySignal(product, categoryTokens))
    : products;

  const candidates =
    strictCategory && categoryTokens.length
      ? productsByCategory
      : productsByCategory.length
        ? productsByCategory
        : products;

  const productIds = candidates
    .map((product) => Number(product.id))
    .filter(Boolean);

  if (!productIds.length) {
    return { products: [], uniqueKeywords, categoryTokens };
  }

  const [salesRows, ratingRows] = await Promise.all([
    OrderItem.findAll({
      attributes: ["product_id", [fn("SUM", col("quantity")), "soldCount"]],
      where: { product_id: { [Op.in]: productIds } },
      group: ["product_id"],
      raw: true,
    }),
    Rating.findAll({
      attributes: [
        "product_id",
        [fn("AVG", col("rating")), "averageRating"],
        [fn("COUNT", col("id")), "totalRatings"],
      ],
      where: { product_id: { [Op.in]: productIds } },
      group: ["product_id"],
      raw: true,
    }),
  ]);

  const salesMap = new Map(
    salesRows.map((row) => [
      Number(row.product_id),
      Number(row.soldCount || 0),
    ]),
  );

  const ratingMap = new Map(
    ratingRows.map((row) => [
      Number(row.product_id),
      {
        averageRating: Number(row.averageRating || 0),
        totalRatings: Number(row.totalRatings || 0),
      },
    ]),
  );

  const rankedProducts = rankProducts({
    products: candidates,
    categoryTokens,
    uniqueKeywords,
    salesMap,
    ratingMap,
    intent,
  }).slice(0, 8);

  return {
    products: rankedProducts,
    uniqueKeywords,
    categoryTokens,
  };
};

class AIController {
  static async searchImage(req, res, next) {
    try {
      if (!req.file) {
        throw { name: "BadRequest", message: "Image is required" };
      }

      // 1. Kirim ke AI
      const aiResult = await analyzeImage(
        req.file.buffer,
        req.file.mimetype || "image/jpeg",
      );

      const { products, uniqueKeywords } = await findProductsFromAiSignals({
        productName: aiResult.product_name,
        rawText: aiResult.raw_text,
        aiKeywords: aiResult.keywords,
        categoryHint: aiResult.category_hint,
        strictCategory: true,
        intent: {
          isRecommendation: false,
          wantsPopular: false,
          wantsTasty: false,
        },
      });

      res.json({
        ai_result: products.length
          ? `Aku menemukan ${products.length} produk yang paling relevan dari foto (${aiResult.category_hint || "produk"}).`
          : "Belum ketemu produk yang sejenis dengan foto. Coba foto yang lebih fokus atau dari sudut lain.",
        product_name: aiResult.product_name,
        keywords: uniqueKeywords,
        category_hint: aiResult.category_hint,
        products,
      });
    } catch (error) {
      next(error);
    }
  }

  static async searchText(req, res, next) {
    try {
      const query = String(req.body?.query || "").trim();

      if (!query) {
        throw { name: "BadRequest", message: "Query is required" };
      }

      const intent = detectRecommendationIntent(query);
      const baseKeywords = extractKeywords(query).filter(
        (word) => !GENERIC_RECOMMENDATION_TERMS.has(word),
      );

      const { products, uniqueKeywords } = await findProductsFromAiSignals({
        productName: intent.isRecommendation ? "" : query,
        rawText: query,
        aiKeywords: baseKeywords,
        recommendationMode: intent.isRecommendation,
        intent,
      });

      let aiResultText =
        "Belum ketemu produk yang cocok. Coba pakai kata kunci lain ya.";

      if (products.length) {
        if (intent.isRecommendation) {
          if (intent.wantsPopular && intent.wantsTasty) {
            aiResultText = `Aku rekomendasikan ${products.length} produk yang paling populer sekaligus paling disukai pelanggan.`;
          } else if (intent.wantsPopular) {
            aiResultText = `Ini ${products.length} rekomendasi produk yang paling populer dan banyak dibeli.`;
          } else if (intent.wantsTasty) {
            aiResultText = `Ini ${products.length} rekomendasi produk yang paling enak berdasarkan rating pelanggan.`;
          } else {
            aiResultText = `Aku rekomendasikan ${products.length} produk terbaik buat kamu.`;
          }
        } else {
          aiResultText = `Aku menemukan ${products.length} produk untuk pencarianmu.`;
        }
      }

      res.json({
        ai_result: aiResultText,
        product_name: query,
        keywords: uniqueKeywords,
        products,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AIController;
