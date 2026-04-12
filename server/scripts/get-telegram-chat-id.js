#!/usr/bin/env node

/**
 * Script untuk ambil Admin Chat ID dari Telegram Bot
 *
 * Caranya:
 * 1. Pastikan sudah /start bot di Telegram (@fayda_store_bot)
 * 2. Jalankan: node scripts/get-telegram-chat-id.js
 * 3. Copy Chat ID, update ke .env
 */

const https = require("https");

const TELEGRAM_BOT_TOKEN = "8347604566:AAFA_tFFTEhpUS0nTtjgQQKj8a_bZwE60Yg";

function getTelegramChatId() {
  return new Promise((resolve, reject) => {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`;

    https
      .get(url, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const json = JSON.parse(data);

            if (!json.ok) {
              reject(new Error("Telegram API error: " + json.description));
              return;
            }

            if (json.result.length === 0) {
              reject(
                new Error(
                  "❌ Tidak ada message dari bot. Pastikan sudah /start bot di Telegram terlebih dahulu!",
                ),
              );
              return;
            }

            const message = json.result[json.result.length - 1]?.message;
            if (!message || !message.from?.id) {
              reject(new Error("❌ Chat ID tidak ditemukan dalam response"));
              return;
            }

            const chatId = message.from.id;
            console.log("\n✅ Chat ID Admin ditemukan:");
            console.log(`\n   ${chatId}\n`);
            console.log("📝 Salin chat ID di atas, lalu update ke .env:");
            console.log(`   TELEGRAM_ADMIN_CHAT_ID="${chatId}"\n`);

            resolve(chatId);
          } catch (err) {
            reject(new Error("Parse error: " + err.message));
          }
        });
      })
      .on("error", reject);
  });
}

getTelegramChatId()
  .then(() => {
    console.log("✨ Selesai! Restart server untuk aktifkan notif.\n");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Error:", err.message);
    process.exit(1);
  });
