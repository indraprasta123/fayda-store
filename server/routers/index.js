const router = require("express").Router();
const errorHandler = require("../middlewares/errorHandler");
const authRoutes = require("../routers/auth");
const userRoutes = require("../routers/user");
const adminRoutes = require("../routers/admin");
const aiRoutes = require("../routers/aiRoutes");
const paymentRoutes = require("../routers/payment");
const shippingRoutes = require("../routers/shipping");

router.use("/ai", aiRoutes);

router.use("/admin", adminRoutes);
router.use("/shipping", shippingRoutes);

router.use("/pub", userRoutes);
router.use("/auth", authRoutes);
router.use(paymentRoutes);
router.use(errorHandler);

module.exports = router;
