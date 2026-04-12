const express = require("express");
const router = express.Router();

const authentication = require("../middlewares/authentication");
const authorization = require("../middlewares/authorization");
const UserController = require("../controllers/UserController");

// --- PUBLIC ROUTES ---
// Lihat daftar produk (tanpa login)
router.get("/products", UserController.getProducts);

// Lihat detail produk (tanpa login)
router.get("/products/:id", UserController.getProductById);

// --- PRIVATE ROUTES ---
// Tambah produk ke keranjang (harus login)
router.post(
  "/cart",
  authentication,
  authorization(["user", "admin"]),
  UserController.addToCart,
);

// Lihat keranjang
router.get(
  "/cart",
  authentication,
  authorization(["user", "admin"]),
  UserController.getCart,
);

// Checkout
router.post(
  "/checkout",
  authentication,
  authorization(["user", "admin"]),
  UserController.checkout,
);

// Lihat riwayat pesanan
router.get(
  "/orders",
  authentication,
  authorization(["user", "admin"]),
  UserController.getOrders,
);

// Buat order dari cart
router.post(
  "/order/create",
  authentication,
  authorization(["user", "admin"]),
  UserController.createOrder,
);

// Lihat profile user login
router.get(
  "/profile",
  authentication,
  authorization(["user", "admin"]),
  UserController.getMyProfile,
);

// Update profile user login
router.patch(
  "/profile",
  authentication,
  authorization(["user", "admin"]),
  UserController.updateMyProfile,
);

// Tambah rating untuk produk
router.post(
  "/rating",
  authentication,
  authorization(["user", "admin"]),
  UserController.addRating,
);

// Lihat rating produk
router.get("/ratings/product/:productId", UserController.getProductRatings);

// Lihat rating user untuk order tertentu
router.get(
  "/ratings/order/:orderId",
  authentication,
  authorization(["user", "admin"]),
  UserController.getUserOrderRatings,
);

module.exports = router;
