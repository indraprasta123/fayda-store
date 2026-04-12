const PaymentController = require("../controllers/PaymentController");
const router = require("express").Router();
const authentication = require("../middlewares/authentication");
const authorization = require("../middlewares/authorization");

// Semua route pembayaran harus login + role admin atau user
router.use(authentication);

router.post(
  "/payment",
  authorization(["user"]),
  PaymentController.createTransaction,
);

module.exports = router;
