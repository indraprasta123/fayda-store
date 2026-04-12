const jwt = require("jsonwebtoken");

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || process.env.SECRET_KEY;

  if (!secret) {
    throw new Error(
      "JWT secret is missing. Set JWT_SECRET or SECRET_KEY in server .env",
    );
  }

  return secret;
}

function signToken(payload) {
  return jwt.sign(payload, getJwtSecret());
}

function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

module.exports = {
  signToken,
  verifyToken,
};
