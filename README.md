## SMTP Reset Password Setup

Tambahkan environment variable berikut di `server/.env` agar token reset password bisa dikirim via email:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM="Fayda Store <your_email@gmail.com>"
```

Catatan:

- Untuk Gmail, gunakan App Password (bukan password akun utama).
- Setelah setup, endpoint `/auth/forgot-password` akan mengirim token reset ke email user.
