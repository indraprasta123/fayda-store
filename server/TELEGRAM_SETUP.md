/\*\*

- SETUP GUIDE - TELEGRAM NOTIFICATION
-
- Langkah-langkah untuk setup Telegram Bot notification agar admin dapat notif pesanan baru
  \*/

// ============================================================================
// STEP 1: Daftarkan diri sebagai tester/admin bot
// ============================================================================
// 1. Buka Telegram dan cari bot: @fayda_store_bot
// 2. Klik START atau kirim /start ke bot tersebut
// 3. Lanjut ke STEP 2

// ============================================================================
// STEP 2: Dapatkan Admin Chat ID
// ============================================================================
// Buka URL ini di browser (copy paste):
// https://api.telegram.org/bot8773750427:AAEUFa9Bb0S2ojfWgOLZVSY16abAvKiYNTM/getUpdates

// Contoh response JSON:
// {
// "ok": true,
// "result": [
// {
// "update_id": 123456789,
// "message": {
// "message_id": 1,
// "from": {
// "id": 987654321, <--- INI ADALAH CHAT ID ADMIN
// "is_bot": false,
// "first_name": "Admin",
// ...
// },
// ...
// }
// }
// ]
// }

// Cari nilai "id" di dalam "from" object. Contoh: 987654321

// ============================================================================
// STEP 3: Update .env dengan Chat ID
// ============================================================================
// Buka file .env di server folder, update:
// TELEGRAM_CHAT_ID="987654321"
// (ganti 987654321 dengan ID yang kamu dapat dari STEP 2)

// ============================================================================
// STEP 4: Restart server
// ============================================================================
// Terminal, masuk folder server:
// npm start
// atau
// nodemon (jika sudah setup)

// ============================================================================
// STEP 5: Test dengan buat pesanan baru
// ============================================================================
// 1. Buka aplikasi client (http://localhost:5173)
// 2. Login dengan user account
// 3. Tambah produk ke keranjang
// 4. Checkout dan selesaikan
// 5. Cek Telegram bot, seharusnya admin dapat notif pesanan baru!

// ============================================================================
// TROUBLESHOOTING
// ============================================================================
// Q: Notif tidak terkirim ke Telegram
// A: - Pastikan TELEGRAM_ADMIN_CHAT_ID di .env sudah benar
// - Pastikan sudah /start bot terlebih dahulu
// - Cek console server, ada error message indikasi masalah

// Q: Chat ID 123456789 vs -123456789
// A: Gunakan format yang didapat dari /getUpdates API, biasanya positif untuk individual

console.log("✅ Setup Telegram Notification sudah jalan!");
console.log("📝 Dokumentasi:\n");
console.log("- Bot Token: Sudah ada di .env");
console.log("- Admin Chat ID: Perlu diisi dengan ID kamu");
console.log("- Setiap pesanan baru → notif ke Telegram (tanpa block API response)");
