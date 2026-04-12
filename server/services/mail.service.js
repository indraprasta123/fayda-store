const nodemailer = require("nodemailer");

function buildTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const rawPort = process.env.SMTP_PORT || "587";
  const secure = String(process.env.SMTP_SECURE || "false") === "true";
  const port = Number(rawPort);

  if (!host || !user || !pass || !Number.isFinite(port)) {
    throw new Error(
      "SMTP config is missing. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and optional SMTP_SECURE.",
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

async function sendResetPasswordTokenEmail({
  to,
  name,
  token,
  expiresInMinutes = 15,
}) {
  if (!to || !token) {
    throw new Error("Email recipient and token are required");
  }

  const transporter = buildTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const userName = name || "Pelanggan";
  const appName = process.env.APP_NAME || "Fayda Store";
  const supportEmail = process.env.SUPPORT_EMAIL || process.env.SMTP_USER;
  const year = new Date().getFullYear();

  const subject = `Reset Password Token - ${appName}`;
  const text = `
Halo ${userName},

Kamu meminta reset password akun ${appName}.
Gunakan token ini untuk melanjutkan:

${token}

Token berlaku ${expiresInMinutes} menit.

Jika kamu tidak meminta reset password, abaikan email ini.

---

Hi ${userName},

You requested a password reset for your ${appName} account.
Use this token to continue:

${token}

This token expires in ${expiresInMinutes} minutes.

If you did not request this, please ignore this email.

Support: ${supportEmail}
  `.trim();

  const html = `
    <div style="background:#f8fafc;padding:28px 14px;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
        <div style="padding:18px 22px;background:linear-gradient(90deg,#f97316,#f59e0b);color:#fff;">
          <div style="font-size:13px;opacity:.9;letter-spacing:.12em;text-transform:uppercase;">${appName}</div>
          <h1 style="margin:8px 0 0 0;font-size:22px;line-height:1.25;">Reset Password Token</h1>
        </div>

        <div style="padding:22px;line-height:1.65;">
          <p style="margin:0 0 12px 0;">Halo <strong>${userName}</strong>,</p>
          <p style="margin:0 0 14px 0;">Kamu meminta reset password akun <strong>${appName}</strong>. Gunakan token di bawah ini:</p>

          <div style="margin:8px 0 14px 0;display:inline-block;padding:12px 16px;background:#f97316;color:#fff;border-radius:10px;font-size:18px;font-weight:700;letter-spacing:.08em;">
            ${token}
          </div>

          <p style="margin:0 0 12px 0;color:#334155;">Token berlaku <strong>${expiresInMinutes} menit</strong>.</p>
          <p style="margin:0 0 18px 0;color:#475569;">Jika kamu tidak meminta reset password, abaikan email ini.</p>

          <hr style="border:none;border-top:1px solid #e2e8f0;margin:18px 0;" />

          <p style="margin:0 0 12px 0;"><strong>English</strong></p>
          <p style="margin:0 0 12px 0;color:#334155;">You requested a password reset for your <strong>${appName}</strong> account. Use the token above. It expires in <strong>${expiresInMinutes} minutes</strong>.</p>
          <p style="margin:0;color:#475569;">If you did not request this, please ignore this email.</p>
        </div>

        <div style="padding:14px 22px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
          Need help? Contact <a href="mailto:${supportEmail}" style="color:#ea580c;text-decoration:none;">${supportEmail}</a><br/>
          © ${year} ${appName}
        </div>
      </div>
    </div>
  `;

  return transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}

module.exports = {
  sendResetPasswordTokenEmail,
};
