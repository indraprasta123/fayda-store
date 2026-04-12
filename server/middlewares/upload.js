const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDirectory = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDirectory);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname || "");
    const safeBaseName = path
      .basename(file.originalname || "image", extension)
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .toLowerCase();

    callback(null, `${Date.now()}-${safeBaseName}${extension}`);
  },
});

const fileFilter = (_req, file, callback) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    callback(null, true);
    return;
  }

  callback(new Error("Only image files are allowed"), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = upload;
