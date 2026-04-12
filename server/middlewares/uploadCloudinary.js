const multer = require("multer");

const fileFilter = (_req, file, callback) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    callback(null, true);
    return;
  }

  callback(new Error("Only image files are allowed"), false);
};

const uploadCloudinary = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = uploadCloudinary;
