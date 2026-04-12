const router = require("express").Router();
const AIController = require("../controllers/AiController");
const uploadCloudinary = require("../middlewares/uploadCloudinary");

router.post(
  "/image-search",
  uploadCloudinary.single("image"),
  AIController.searchImage,
);
router.post("/text-search", AIController.searchText);

module.exports = router;
