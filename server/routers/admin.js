// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const AdminController = require("../controllers/AdminController");
const authentication = require("../middlewares/authentication");
const authorization = require("../middlewares/authorization");
const uploadCloudinary = require("../middlewares/uploadCloudinary");

// ===================== USER MANAGEMENT =====================
// Semua route admin harus login + role admin
router.use(authentication);
router.use(authorization(["admin"]));

router.get("/users", AdminController.getAllUsers); // lihat semua user
router.get("/users/:id", AdminController.getUserById); // lihat user detail
router.patch("/users/:id/role", AdminController.updateUserRole); // ubah role user

// ===================== PRODUCT MANAGEMENT =====================
router.get("/products", AdminController.getAllProducts); // lihat semua produk
router.post(
  "/products",
  uploadCloudinary.single("image"),
  AdminController.addProduct,
); // tambah produk
router.patch(
  "/products/:id",
  uploadCloudinary.single("image"),
  AdminController.updateProduct,
); // update produk
router.delete("/products/:id", AdminController.deleteProduct); // hapus produk

// ===================== CATEGORY MANAGEMENT =====================
router.get("/categories", AdminController.getCategory); // lihat semua kategori
router.post("/categories", AdminController.addCategory); // tambah kategori
router.patch("/categories/:id", AdminController.updateCategory); // update kategori
router.delete("/categories/:id", AdminController.deleteCategory); // hapus kategori

// ===================== ORDER MANAGEMENT =====================
router.get("/dashboard/stats", AdminController.getDashboardStats); // statistik dashboard (bulanan & harian)
router.get("/reports/recap", AdminController.getRecapReport); // rekap laporan penjualan
router.get("/orders", AdminController.getAllOrders); // lihat semua order
router.patch("/orders/:id/status", AdminController.updateOrderStatus); // update status order

// ===================== PAYMENT MANAGEMENT =====================
router.get("/payments", AdminController.getAllPayments); // lihat semua payment
router.patch("/payments/:id/status", AdminController.updatePaymentStatus); // update status pembayaran berdasarkan order id

module.exports = router;
