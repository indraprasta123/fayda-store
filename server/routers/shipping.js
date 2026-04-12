const router = require("express").Router();
const ShippingController = require("../controllers/ShippingController");

// bisa tanpa login juga (public)
router.post("/shipping-cost", ShippingController.getShipping);

module.exports = router;
