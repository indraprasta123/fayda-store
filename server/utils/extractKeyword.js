const STOPWORDS = new Set([
  "yang",
  "dan",
  "atau",
  "untuk",
  "dengan",
  "tolong",
  "dong",
  "nih",
  "itu",
  "ini",
  "saya",
  "aku",
  "produk",
  "barang",
  "cari",
  "carikan",
  "rekomendasi",
  "rekomendasikan",
  "saran",
  "sarankan",
  "minta",
  "ingin",
]);

function extractKeywords(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/gi, "")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

module.exports = extractKeywords;
