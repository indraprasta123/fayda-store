const axios = require("axios");

async function sendNewOrderTelegram(order = {}) {
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!telegramToken || !adminChatId) {
    console.warn("Telegram credentials not set, skipping notification");
    return null;
  }

  const {
    orderId,
    customerName = "Customer",
    customerPhone = "-",
    totalPrice = 0,
    paymentMethod = "-",
    items = [],
    address = {},
  } = order;

  const formattedPrice = parseInt(totalPrice).toLocaleString("id-ID");

  // Format product list
  let productList = "Produk:";
  if (Array.isArray(items) && items.length > 0) {
    items.forEach((item) => {
      const productName = item?.product?.name || "Produk";
      const quantity = item?.quantity || 1;
      productList += `\n  • ${productName} (Qty: ${quantity})`;
    });
  } else {
    productList += "\n  • -";
  }

  // Format address
  const addressStr = address?.address || "-";
  const cityStr = address?.city || "-";

  const message = `
🔔 *PESANAN BARU MASUK!*

📋 Order ID: \`#${orderId}\`
👤 Pelanggan: ${customerName}
📱 No WA: ${customerPhone}
💳 Metode Bayar: ${paymentMethod === "cod" ? "Tunai (COD)" : paymentMethod === "midtrans" ? "Online" : paymentMethod}

${productList}

📍 Alamat Pengiriman:
${addressStr}
${cityStr !== "-" ? `Kota/Daerah: ${cityStr}` : ""}

💰 Total: Rp${formattedPrice}

⏱️ Silahkan segera cek aplikasi admin untuk detail lengkap.
  `.trim();

  const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;

  try {
    const { data } = await axios.post(
      url,
      {
        chat_id: adminChatId,
        text: message,
        parse_mode: "Markdown",
      },
      { timeout: 8000 },
    );

    console.log(`✅ Telegram notification sent for order #${orderId}`);
    return data;
  } catch (err) {
    console.error(
      `❌ Telegram notification failed for order #${orderId}:`,
      err?.response?.data || err.message,
    );
    return null;
  }
}

module.exports = { sendNewOrderTelegram };
