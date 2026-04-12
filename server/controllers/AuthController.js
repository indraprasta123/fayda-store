const { User } = require("../models");
const { comparePassword } = require("../helpers/bcrypt");
const { hashPassword } = require("../helpers/bcrypt");
const { signToken } = require("../helpers/jwt");
const { verifyGoogleToken } = require("../helpers/google");
const { sendResetPasswordTokenEmail } = require("../services/mail.service");
const crypto = require("crypto");

class AuthController {
  static async googleLogin(req, res, next) {
    try {
      const google_token = req.body.google_token || req.body.credential;

      if (!google_token) {
        throw { name: "BadRequest", message: "Google token required" };
      }

      const payload = await verifyGoogleToken(google_token);

      const { email, name, sub } = payload;

      let user = await User.findOne({ where: { email } });

      if (!user) {
        user = await User.create({
          name,
          email,
          password: "google-login", // dummy
          provider: "google",
          provider_id: sub,
          role: "user",
        });
      }

      const access_token = signToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      res.status(200).json({
        access_token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async register(req, res, next) {
    try {
      const { name, email, password } = req.body;

      const data = await User.create({
        name,
        email,
        password,
        role: "user",
        provider: "local",
      });

      res.status(201).json({
        id: data.id,
        email: data.email,
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw { name: "BadRequest", message: "Email dan password wajib diisi" };
      }

      const user = await User.findOne({ where: { email } });

      if (!user) {
        throw { name: "Unauthorized", message: "Email/Password salah" };
      }

      // cek password
      const isValid = comparePassword(password, user.password);
      if (!isValid) {
        throw { name: "Unauthorized", message: "Email/Password salah" };
      }

      const access_token = signToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      res.status(200).json({
        access_token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      if (!email) {
        throw { name: "BadRequest", message: "Email wajib diisi" };
      }

      const user = await User.findOne({ where: { email } });
      if (!user) {
        throw { name: "NotFound", message: "Email tidak terdaftar" };
      }

      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenHash = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      user.reset_password_token = resetTokenHash;
      user.reset_password_expires = new Date(Date.now() + 15 * 60 * 1000);
      await user.save({ validate: false });

      try {
        await sendResetPasswordTokenEmail({
          to: user.email,
          name: user.name,
          token: resetToken,
          expiresInMinutes: 15,
        });
      } catch (mailError) {
        user.reset_password_token = null;
        user.reset_password_expires = null;
        await user.save({ validate: false });

        throw {
          name: "InternalServerError",
          message:
            "Gagal mengirim email reset password. Cek konfigurasi SMTP server.",
          detail: mailError?.message,
        };
      }

      res.status(200).json({
        message:
          "Token reset password telah dikirim ke email kamu. Silakan cek inbox/spam.",
      });
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req, res, next) {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        throw {
          name: "BadRequest",
          message: "Token dan password baru wajib diisi",
        };
      }

      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const user = await User.findOne({
        where: {
          reset_password_token: tokenHash,
        },
      });

      if (!user || !user.reset_password_expires) {
        throw { name: "Unauthorized", message: "Token reset tidak valid" };
      }

      if (new Date(user.reset_password_expires).getTime() < Date.now()) {
        throw {
          name: "Unauthorized",
          message: "Token reset sudah kedaluwarsa",
        };
      }

      user.password = hashPassword(password);
      user.reset_password_token = null;
      user.reset_password_expires = null;
      await user.save({ validate: false });

      res.status(200).json({ message: "Password berhasil diperbarui" });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
