const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analyzeImage(fileBuffer, mimeType = "image/jpeg") {
  const model = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
  });

  const image = {
    inlineData: {
      data: fileBuffer.toString("base64"),
      mimeType,
    },
  };

  const prompt = `
Kamu adalah AI untuk pencarian produk e-commerce.
Lihat gambar produk lalu jawab HANYA JSON valid tanpa markdown dengan format:
{
  "product_name": "string",
  "category_hint": "string",
  "keywords": ["string", "string", "string"]
}

Aturan:
- product_name: nama produk paling mungkin (singkat)
- category_hint: pilih SATU nilai paling sesuai dari daftar berikut: "permen", "minuman", "snack", "biskuit", "cokelat", "lainnya"
- keywords: 3-8 kata kunci penting untuk pencarian katalog, utamakan jenis produk pada foto
- semua kata kunci huruf kecil
- jika foto permen, jangan keluarkan kata kunci minuman (dan sebaliknya)
- jangan tambahkan penjelasan lain di luar JSON
`;

  const result = await model.generateContent([prompt, image]);
  const rawText = result.response.text();

  let parsed;
  try {
    const cleaned = rawText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch (error) {
    parsed = {
      product_name: "",
      keywords: [],
      raw_text: rawText,
    };
  }

  return {
    product_name: String(parsed.product_name || "").trim(),
    category_hint: String(parsed.category_hint || "")
      .trim()
      .toLowerCase(),
    keywords: Array.isArray(parsed.keywords)
      ? parsed.keywords
          .map((item) =>
            String(item || "")
              .trim()
              .toLowerCase(),
          )
          .filter(Boolean)
      : [],
    raw_text: parsed.raw_text || rawText,
  };
}

module.exports = { analyzeImage };
