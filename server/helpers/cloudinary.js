const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.SECRET_NAME_CLOUD,
  api_key: process.env.SECRET_KEY_CLOUD,
  api_secret: process.env.SECRET_API_CLOUD, // Click 'View API Keys' above to copy your API secret
});

module.exports = { cloudinary };
