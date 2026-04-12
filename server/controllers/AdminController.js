// controllers/AdminController.js
const {
  User,
  Product,
  Category,
  Order,
  OrderItem,
  Payment,
  Rating,
} = require("../models");
const { Op, fn, col } = require("sequelize");
const {
  emitOrderStatusUpdated,
  emitProductSync,
  emitDashboardRefresh,
} = require("../socket");
const { cloudinary } = require("../helpers/cloudinary");

const uploadImageToCloudinary = async (file) => {
  if (!file) return null;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "fayda_store/products",
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result?.secure_url || result?.url || null);
      },
    );

    uploadStream.end(file.buffer);
  });
};

class AdminController {
  static async resolveCategoryId(categoryName) {
    const normalizedCategoryName = String(categoryName || "").trim();

    if (!normalizedCategoryName) {
      throw { name: "BadRequest", message: "Category is required" };
    }

    const [category] = await Category.findOrCreate({
      where: { name: normalizedCategoryName },
      defaults: { name: normalizedCategoryName },
    });

    return category.id;
  }

  // ===================== User Management =====================
  static async getAllUsers(req, res, next) {
    try {
      const users = await User.findAll({
        attributes: ["id", "name", "email", "role", "createdAt", "updatedAt"],
      });

      res.status(200).json({ users });
    } catch (error) {
      next(error);
    }
  }

  static async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      const user = await User.findByPk(id, {
        attributes: ["id", "name", "email", "role", "createdAt", "updatedAt"],
      });

      if (!user) throw { name: "NotFound", message: "User not found" };

      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  }

  static async updateUserRole(req, res, next) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      const user = await User.findByPk(id);
      if (!user) throw { name: "NotFound", message: "User not found" };

      user.role = role;
      await user.save();

      res.status(200).json({ message: "User role updated", user });
    } catch (error) {
      next(error);
    }
  }

  // ===================== Product Management =====================
  static async getAllProducts(req, res, next) {
    try {
      const [products, ratingRows] = await Promise.all([
        Product.findAll({
          include: [
            { model: Category, as: "category", attributes: ["id", "name"] },
          ],
        }),
        Rating.findAll({
          attributes: [
            "product_id",
            [fn("AVG", col("rating")), "averageRating"],
            [fn("COUNT", col("id")), "totalRatings"],
          ],
          group: ["product_id"],
          raw: true,
        }),
      ]);

      const ratingMap = new Map(
        ratingRows.map((row) => [
          Number(row.product_id),
          {
            averageRating: Number(Number(row.averageRating || 0).toFixed(1)),
            totalRatings: Number(row.totalRatings || 0),
          },
        ]),
      );

      const productsWithRatings = products.map((product) => {
        const plainProduct = product.toJSON();
        const ratingInfo = ratingMap.get(plainProduct.id) || {
          averageRating: 0,
          totalRatings: 0,
        };

        return {
          ...plainProduct,
          averageRating: ratingInfo.averageRating,
          totalRatings: ratingInfo.totalRatings,
        };
      });

      res.status(200).json({ products: productsWithRatings });
    } catch (error) {
      next(error);
    }
  }

  static async addProduct(req, res, next) {
    try {
      const { name, description, price, category, stock, image } = req.body;
      const uploadedImageUrl = await uploadImageToCloudinary(req.file);
      const imageUrl = uploadedImageUrl || image;

      if (!imageUrl) {
        throw { name: "BadRequest", message: "Image is required" };
      }

      const categoryId = await AdminController.resolveCategoryId(category);

      const product = await Product.create({
        category_id: categoryId,
        name,
        description,
        price,
        stock,
        image: imageUrl,
      });

      emitProductSync({
        reason: "product-created",
        product: product.toJSON(),
      });

      res.status(201).json({ message: "Product added", product });
    } catch (error) {
      next(error);
    }
  }

  static async updateProduct(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description, price, category, stock, image } = req.body;

      const product = await Product.findByPk(id);
      if (!product) throw { name: "NotFound", message: "Product not found" };

      const categoryId = await AdminController.resolveCategoryId(category);
      const uploadedImageUrl = await uploadImageToCloudinary(req.file);
      const imageUrl = uploadedImageUrl || image || product.image;

      product.name = name;
      product.description = description;
      product.price = price;
      product.category_id = categoryId;
      product.stock = stock;
      product.image = imageUrl;

      await product.save();

      emitProductSync({
        reason: "product-updated",
        product: product.toJSON(),
      });

      res.status(200).json({ message: "Product updated", product });
    } catch (error) {
      next(error);
    }
  }

  static async deleteProduct(req, res, next) {
    try {
      const { id } = req.params;
      const product = await Product.findByPk(id);
      if (!product) throw { name: "NotFound", message: "Product not found" };

      if (Number(product.stock) > 0) {
        throw {
          name: "BadRequest",
          message: "Produk dengan stok lebih dari 0 tidak dapat dihapus",
        };
      }

      await product.destroy();
      emitProductSync({
        reason: "product-deleted",
        productId: Number(id),
      });
      res.status(200).json({ message: "Product deleted" });
    } catch (error) {
      next(error);
    }
  }

  static async getCategory(req, res, next) {
    try {
      const categories = await Category.findAll();
      res.status(200).json({ categories });
    } catch (error) {
      next(error);
    }
  }

  static async addCategory(req, res, next) {
    try {
      const { name } = req.body;
      const [category] = await Category.findOrCreate({
        where: { name },
        defaults: { name },
      });

      res.status(201).json({ message: "Category added", category });
    } catch (error) {
      next(error);
    }
  }

  static async deleteCategory(req, res, next) {
    try {
      const { id } = req.params;
      const category = await Category.findByPk(id);
      if (!category) throw { name: "NotFound", message: "Category not found" };

      await category.destroy();
      res.status(200).json({ message: "Category deleted" });
    } catch (error) {
      next(error);
    }
  }

  static async updateCategory(req, res, next) {
    try {
      const { id } = req.params;
      const { name } = req.body;

      const category = await Category.findByPk(id);
      if (!category) throw { name: "NotFound", message: "Category not found" };

      category.name = name;
      await category.save();

      res.status(200).json({ message: "Category updated", category });
    } catch (error) {
      next(error);
    }
  }

  // ===================== Order Management =====================
  static async getDashboardStats(req, res, next) {
    try {
      const [totalUsers, orders] = await Promise.all([
        User.count(),
        Order.findAll({
          include: [
            { model: User, as: "user", attributes: ["id", "name", "email"] },
          ],
          order: [["createdAt", "DESC"]],
        }),
      ]);

      const totalOrders = orders.length;
      const totalRevenue = orders.reduce(
        (sum, order) => sum + Number(order.total_price || 0),
        0,
      );

      const monthFormatter = new Intl.DateTimeFormat("id-ID", {
        month: "short",
        year: "numeric",
      });

      const dateFormatter = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Jakarta",
      });

      const monthlyMap = new Map();
      const dailyMap = new Map();

      orders.forEach((order) => {
        const orderDate = new Date(order.createdAt);

        const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, "0")}`;
        const monthLabel = monthFormatter.format(orderDate);

        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, {
            monthKey,
            monthLabel,
            totalOrders: 0,
            revenue: 0,
          });
        }

        const monthlyEntry = monthlyMap.get(monthKey);
        monthlyEntry.totalOrders += 1;
        monthlyEntry.revenue += Number(order.total_price || 0);

        const dateKey = dateFormatter.format(orderDate);

        if (!dailyMap.has(dateKey)) {
          dailyMap.set(dateKey, {
            date: dateKey,
            totalOrders: 0,
            revenue: 0,
          });
        }

        const dailyEntry = dailyMap.get(dateKey);
        dailyEntry.totalOrders += 1;
        dailyEntry.revenue += Number(order.total_price || 0);
      });

      const monthlyStats = Array.from(monthlyMap.values())
        .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
        .slice(0, 6);

      const dailyOrders = Array.from(dailyMap.values())
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 14);

      const todayKey = dateFormatter.format(new Date());
      const todayOrders = orders
        .filter(
          (order) =>
            dateFormatter.format(new Date(order.createdAt)) === todayKey,
        )
        .slice(0, 20)
        .map((order) => ({
          id: order.id,
          user: order.user?.name || "-",
          total: Number(order.total_price || 0),
          status: order.status,
          date: order.createdAt,
        }));

      res.status(200).json({
        overview: {
          totalUsers,
          totalOrders,
          totalRevenue,
        },
        monthlyStats,
        dailyOrders,
        todayOrders,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRecapReport(req, res, next) {
    try {
      const { period = "day", date, month, year, topScope = "day" } = req.query;

      const now = new Date();
      let rangeStart;
      let rangeEnd;

      if (period === "day") {
        const selectedDate = date ? new Date(date) : now;
        if (Number.isNaN(selectedDate.getTime())) {
          throw { name: "BadRequest", message: "Invalid date format" };
        }

        rangeStart = new Date(selectedDate);
        rangeStart.setHours(0, 0, 0, 0);
        rangeEnd = new Date(selectedDate);
        rangeEnd.setHours(23, 59, 59, 999);
      } else if (period === "month") {
        let selectedYear = Number(year);
        let selectedMonth = Number(month);

        if (!selectedYear || Number.isNaN(selectedYear)) {
          selectedYear = now.getFullYear();
        }

        if (!selectedMonth || Number.isNaN(selectedMonth)) {
          selectedMonth = now.getMonth() + 1;
        }

        rangeStart = new Date(selectedYear, selectedMonth - 1, 1, 0, 0, 0, 0);
        rangeEnd = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);
      } else if (period === "year") {
        const selectedYear = Number(year) || now.getFullYear();
        rangeStart = new Date(selectedYear, 0, 1, 0, 0, 0, 0);
        rangeEnd = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
      } else {
        throw {
          name: "BadRequest",
          message: "Invalid period. Use day, month, or year",
        };
      }

      let topStart;
      let topEnd;
      if (topScope === "day") {
        topStart = new Date(now);
        topStart.setHours(0, 0, 0, 0);
        topEnd = new Date(now);
        topEnd.setHours(23, 59, 59, 999);
      } else if (topScope === "month") {
        topStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        topEnd = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        );
      } else {
        topStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        topEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      }

      const [orders, topOrders] = await Promise.all([
        Order.findAll({
          where: {
            createdAt: {
              [Op.between]: [rangeStart, rangeEnd],
            },
          },
          include: [
            { model: User, as: "user", attributes: ["id", "name", "email"] },
            {
              model: OrderItem,
              as: "items",
              include: [
                {
                  model: Product,
                  as: "product",
                  attributes: ["id", "name", "price"],
                },
              ],
            },
          ],
          order: [["createdAt", "DESC"]],
        }),
        Order.findAll({
          where: {
            createdAt: {
              [Op.between]: [topStart, topEnd],
            },
          },
          include: [
            {
              model: OrderItem,
              as: "items",
              include: [
                {
                  model: Product,
                  as: "product",
                  attributes: ["id", "name", "price"],
                },
              ],
            },
          ],
        }),
      ]);

      const totalOrders = orders.length;
      const totalRevenue = orders.reduce(
        (sum, order) => sum + Number(order.total_price || 0),
        0,
      );

      const totalItemsSold = orders.reduce((sum, order) => {
        const orderItems = Array.isArray(order.items) ? order.items : [];
        return (
          sum +
          orderItems.reduce(
            (itemSum, item) => itemSum + Number(item.quantity || 0),
            0,
          )
        );
      }, 0);

      const topProductMap = new Map();
      topOrders.forEach((order) => {
        const orderItems = Array.isArray(order.items) ? order.items : [];

        orderItems.forEach((item) => {
          const productId = item?.product?.id;
          if (!productId) return;

          if (!topProductMap.has(productId)) {
            topProductMap.set(productId, {
              id: productId,
              name: item?.product?.name || "-",
              totalQty: 0,
              totalRevenue: 0,
            });
          }

          const existing = topProductMap.get(productId);
          const qty = Number(item.quantity || 0);
          existing.totalQty += qty;
          existing.totalRevenue +=
            qty * Number(item.price || item?.product?.price || 0);
        });
      });

      const topProducts = Array.from(topProductMap.values())
        .sort((a, b) => b.totalQty - a.totalQty)
        .slice(0, 10);

      const orderRows = orders.map((order) => ({
        id: order.id,
        user: order.user?.name || "-",
        email: order.user?.email || "-",
        total: Number(order.total_price || 0),
        status: order.status,
        date: order.createdAt,
        itemCount: Array.isArray(order.items)
          ? order.items.reduce(
              (sum, item) => sum + Number(item.quantity || 0),
              0,
            )
          : 0,
      }));

      res.status(200).json({
        filters: {
          period,
          topScope,
          rangeStart,
          rangeEnd,
        },
        summary: {
          totalOrders,
          totalRevenue,
          totalItemsSold,
        },
        orders: orderRows,
        topProducts,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAllOrders(req, res, next) {
    try {
      const orders = await Order.findAll({
        include: [
          { model: User, as: "user", attributes: ["id", "name", "email"] },
          {
            model: OrderItem,
            as: "items",
            include: [
              {
                model: Product,
                as: "product",
                attributes: ["id", "name", "price"],
              },
            ],
          },
          { model: Payment, as: "payment" },
        ],
        order: [["createdAt", "DESC"]],
      });

      res.status(200).json({ orders });
    } catch (error) {
      next(error);
    }
  }

  static async updateOrderStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body; // contoh: "pending", "completed", "cancelled"

      const order = await Order.findByPk(id);
      if (!order) throw { name: "NotFound", message: "Order not found" };

      order.status = status;
      await order.save();
      emitOrderStatusUpdated(order);
      emitDashboardRefresh({
        reason: "order-status-updated",
        orderId: order.id,
      });

      res.status(200).json({ message: "Order status updated", order });
    } catch (error) {
      next(error);
    }
  }

  static async getAllPayments(req, res, next) {
    try {
      const orders = await Order.findAll({
        include: [
          { model: User, as: "user", attributes: ["id", "name", "email"] },
          { model: Payment, as: "payment" },
        ],
        order: [["createdAt", "DESC"]],
      });

      const payments = orders.map((order) => ({
        id: order.payment?.id || `order-${order.id}`,
        order_id: order.id,
        transaction_id: order.payment?.transaction_id || "-",
        payment_type:
          order.payment?.payment_type || order.payment_method || "-",
        gross_amount: order.payment?.gross_amount || order.total_price || 0,
        payment_status:
          order.payment?.payment_status || order.payment_status || "pending",
        payment_url: order.payment?.payment_url || null,
        createdAt: order.payment?.createdAt || order.createdAt,
        updatedAt: order.payment?.updatedAt || order.updatedAt,
        user: order.user,
        order,
      }));

      res.status(200).json({ payments });
    } catch (error) {
      next(error);
    }
  }

  static async updatePaymentStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { payment_status } = req.body;

      const order = await Order.findByPk(id);
      if (!order) throw { name: "NotFound", message: "Order not found" };

      order.payment_status = payment_status;
      if (payment_status === "paid" && order.status === "pending") {
        order.status = "processing";
      }
      await order.save();

      const payment = await Payment.findOne({ where: { order_id: id } });
      if (payment) {
        payment.payment_status = payment_status;
        await payment.save();
      }

      emitOrderStatusUpdated(order);
      emitDashboardRefresh({
        reason: "payment-status-updated",
        orderId: order.id,
      });

      res.status(200).json({
        message: "Payment status updated",
        order,
        payment: payment || null,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AdminController;
