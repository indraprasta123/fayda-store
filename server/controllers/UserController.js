const {
  Product,
  Category,
  Cart,
  Order,
  OrderItem,
  Address,
  sequelize,
  User,
  Rating,
} = require("../models");
const { fn, col } = require("sequelize");
const { sendNewOrderTelegram } = require("../services/telegram.service");
const { emitOrderCreated, emitProductSync } = require("../socket");
const {
  calculateShippingFromLatLng,
} = require("../services/shippingService");

class UserController {
  static async getProducts(req, res, next) {
    try {
      const products = await Product.findAll({
        include: [
          { model: Category, as: "category", attributes: ["id", "name"] },
        ],
      });

      const soldRows = await OrderItem.findAll({
        attributes: ["product_id", [fn("SUM", col("quantity")), "soldCount"]],
        group: ["product_id"],
        raw: true,
      });

      const soldCountMap = new Map(
        soldRows.map((row) => [
          Number(row.product_id),
          Number(row.soldCount || 0),
        ]),
      );

      const productsWithSales = products
        .map((product) => {
          const plainProduct = product.toJSON();

          return {
            ...plainProduct,
            soldCount: soldCountMap.get(plainProduct.id) || 0,
          };
        })
        .sort((a, b) => {
          const salesDiff = Number(b.soldCount || 0) - Number(a.soldCount || 0);
          if (salesDiff !== 0) return salesDiff;
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });

      res.status(200).json(productsWithSales);
    } catch (error) {
      next(error);
    }
  }

  static async getProductById(req, res, next) {
    try {
      const product = await Product.findByPk(req.params.id, {
        include: [
          { model: Category, as: "category", attributes: ["id", "name"] },
        ],
      });

      if (!product) throw { name: "NotFound", message: "Product not found" };
      res.status(200).json(product);
    } catch (error) {
      next(error);
    }
  }

  static async addToCart(req, res, next) {
    try {
      const { productId, quantity } = req.body;
      const userId = req.user.id;

      const cart = await Cart.create({ userId, productId, quantity });
      res.status(201).json(cart);
    } catch (error) {
      next(error);
    }
  }

  static async getCart(req, res, next) {
    try {
      const userId = req.user.id;
      const cartItems = await Cart.findAll({
        where: { userId },
        include: [Product],
      });
      res.status(200).json(cartItems);
    } catch (error) {
      next(error);
    }
  }

  static async checkout(req, res, next) {
    try {
      const userId = req.user.id;

      const cartItems = await Cart.findAll({ where: { userId } });
      if (!cartItems.length) {
        throw { name: "BadRequest", message: "Cart kosong" };
      }

      const order = await Order.create({ userId, status: "pending" });

      for (const item of cartItems) {
        await OrderItem.create({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
        });
      }

      await Cart.destroy({ where: { userId } });

      res.status(201).json({ message: "Checkout berhasil", orderId: order.id });
    } catch (error) {
      next(error);
    }
  }

  static async getOrders(req, res, next) {
    try {
      const userId = req.user.id;
      const orders = await Order.findAll({
        where: { user_id: userId },
        include: [
          {
            model: OrderItem,
            as: "items",
            include: [
              {
                model: Product,
                as: "product",
                attributes: ["id", "name", "price", "image"],
              },
            ],
          },
        ],
        order: [["createdAt", "DESC"]],
      });
      res.status(200).json(orders);
    } catch (error) {
      next(error);
    }
  }

  static async createOrder(req, res, next) {
    try {
      const userId = req.user.id;
      const { deliveryInfo, paymentMethod, totalPrice, cartItems } = req.body;

      if (!deliveryInfo || !paymentMethod || !totalPrice) {
        throw {
          name: "BadRequest",
          message:
            "Delivery info, payment method, and total price are required",
        };
      }

      if (!Array.isArray(cartItems) || cartItems.length === 0) {
        throw { name: "BadRequest", message: "Cart is empty" };
      }

      const user = await User.findByPk(userId, {
        attributes: ["id", "name", "email"],
      });

      if (!user) {
        throw { name: "NotFound", message: "User not found" };
      }

      let subtotal = 0;
      for (const item of cartItems) {
        const productId = Number(item.id);
        const quantity = Number(item.quantity || item.qty || 1);
        const product = await Product.findByPk(productId);
        if (!product) {
          throw {
            name: "NotFound",
            message: `Product with id ${productId} not found`,
          };
        }
        subtotal += Number(product.price) * quantity;
      }

      const lat = Number(deliveryInfo.latitude ?? deliveryInfo.lat);
      const lng = Number(deliveryInfo.longitude ?? deliveryInfo.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw {
          name: "BadRequest",
          message:
            "Koordinat pengiriman tidak valid. Gunakan Ambil Lokasi Otomatis di halaman pengiriman.",
        };
      }

      const shippingQuote = await calculateShippingFromLatLng(lat, lng);
      const expectedTotal = subtotal + shippingQuote.shippingCost;
      const receivedTotal = Number(totalPrice);
      if (Math.abs(receivedTotal - expectedTotal) > 2) {
        throw {
          name: "BadRequest",
          message:
            "Total pembayaran tidak sesuai harga produk dan ongkir saat ini. Muat ulang halaman pembayaran dan coba lagi.",
        };
      }

      const createdOrder = await sequelize.transaction(async (transaction) => {
        const updatedProducts = [];

        const [address] = await Address.findOrCreate({
          where: {
            user_id: userId,
            recipient_name: deliveryInfo.name,
            phone: deliveryInfo.phone,
            address: deliveryInfo.address,
          },
          defaults: {
            user_id: userId,
            recipient_name: deliveryInfo.name,
            phone: deliveryInfo.phone,
            address: deliveryInfo.address,
            city: deliveryInfo.locationPoint || "",
            province: deliveryInfo.locationPoint || "",
            postal_code: "00000",
            latitude: Number(deliveryInfo.latitude || deliveryInfo.lat || 0),
            longitude: Number(deliveryInfo.longitude || deliveryInfo.lng || 0),
          },
          transaction,
        });

        const order = await Order.create(
          {
            user_id: userId,
            address_id: address.id,
            total_price: Number(totalPrice),
            payment_method: paymentMethod,
            payment_status: "pending",
            status: "pending",
          },
          { transaction },
        );

        for (const item of cartItems) {
          const productId = Number(item.id);
          const quantity = Number(item.quantity || item.qty || 1);

          const product = await Product.findByPk(productId, { transaction });
          if (!product) {
            throw {
              name: "NotFound",
              message: `Product with id ${productId} not found`,
            };
          }

          if (Number(product.stock) < quantity) {
            throw {
              name: "BadRequest",
              message: `Stok produk ${product.name} tidak mencukupi`,
            };
          }

          await OrderItem.create(
            {
              order_id: order.id,
              product_id: product.id,
              quantity,
              price: Number(product.price),
            },
            { transaction },
          );

          product.stock = Number(product.stock) - quantity;
          await product.save({ transaction });

          updatedProducts.push({
            id: product.id,
            name: product.name,
            stock: Number(product.stock),
            price: Number(product.price),
          });
        }

        const orderData = await Order.findByPk(order.id, {
          include: [
            {
              model: OrderItem,
              as: "items",
              include: [
                {
                  model: Product,
                  as: "product",
                  attributes: ["id", "name", "price", "image"],
                },
              ],
            },
            { model: Address, as: "address" },
          ],
          transaction,
        });

        return {
          orderData,
          updatedProducts,
        };
      });

      emitOrderCreated(createdOrder.orderData);
      emitProductSync({
        reason: "stock-updated-after-order",
        products: createdOrder.updatedProducts || [],
      });

      sendNewOrderTelegram({
        orderId: createdOrder.orderData.id,
        customerName: user.name || "Customer",
        customerPhone: createdOrder.orderData.address?.phone || "-",
        totalPrice: createdOrder.orderData.total_price,
        paymentMethod: createdOrder.orderData.payment_method,
        items: createdOrder.orderData.items || [],
        address: createdOrder.orderData.address || {},
      }).catch((err) => {
        console.error("Telegram notification error (caught):", err.message);
      });

      res.status(201).json({
        message: "Order created successfully",
        order: createdOrder.orderData,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyProfile(req, res, next) {
    try {
      const userId = req.user.id;

      const user = await User.findByPk(userId, {
        attributes: { exclude: ["password"] },
        include: [
          {
            model: require("../models").Profile,
            as: "profile",
            attributes: [
              "id",
              "phone",
              "gender",
              "date_of_birth",
              "createdAt",
              "updatedAt",
            ],
          },
        ],
      });

      if (!user) {
        throw { name: "NotFound", message: "User not found" };
      }

      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }

  static async updateMyProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const { name, email, phone, gender, date_of_birth } = req.body;

      const user = await User.findByPk(userId);
      if (!user) {
        throw { name: "NotFound", message: "User not found" };
      }

      if (name) user.name = name;
      if (email && email !== user.email) {
        const existingEmail = await User.findOne({ where: { email } });
        if (existingEmail) {
          throw { name: "BadRequest", message: "Email sudah terdaftar" };
        }
        user.email = email;
      }
      await user.save();

      const { Profile } = require("../models");
      let profile = await Profile.findOne({ where: { user_id: userId } });

      if (profile) {
        if (phone) profile.phone = phone;
        if (gender) profile.gender = gender;
        if (date_of_birth) profile.date_of_birth = date_of_birth;
        await profile.save();
      } else if (phone && gender && date_of_birth) {
        profile = await Profile.create({
          user_id: userId,
          phone,
          gender,
          date_of_birth,
        });
      }

      const updatedUser = await User.findByPk(userId, {
        attributes: { exclude: ["password"] },
        include: [
          {
            model: Profile,
            as: "profile",
            attributes: [
              "id",
              "phone",
              "gender",
              "date_of_birth",
              "createdAt",
              "updatedAt",
            ],
          },
        ],
      });

      res.status(200).json({
        message: "Profile updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  }

  static async addRating(req, res, next) {
    try {
      const { productId, orderId, rating, review } = req.body;
      const userId = req.user.id;

      // Validate rating is between 1 and 5
      if (!rating || rating < 1 || rating > 5) {
        throw { name: "BadRequest", message: "Rating must be between 1 and 5" };
      }

      // Check if product exists
      const product = await Product.findByPk(productId);
      if (!product) {
        throw { name: "NotFound", message: "Product not found" };
      }

      // Check if order exists and belongs to user
      const order = await Order.findOne({
        where: { id: orderId, user_id: userId },
      });
      if (!order) {
        throw { name: "NotFound", message: "Order not found" };
      }

      // Check if order is completed
      if (order.status !== "delivered") {
        throw {
          name: "BadRequest",
          message: "Can only rate delivered orders",
        };
      }

      // Check if rating already exists for this order and product
      const existingRating = await Rating.findOne({
        where: {
          user_id: userId,
          product_id: productId,
          order_id: orderId,
        },
      });

      if (existingRating) {
        throw {
          name: "BadRequest",
          message: "You have already rated this product for this order",
        };
      }

      const newRating = await Rating.create({
        user_id: userId,
        product_id: productId,
        order_id: orderId,
        rating,
        review: review || null,
      });

      res.status(201).json({
        message: "Rating added successfully",
        rating: newRating,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProductRatings(req, res, next) {
    try {
      const { productId } = req.params;

      // Check if product exists
      const product = await Product.findByPk(productId);
      if (!product) {
        throw { name: "NotFound", message: "Product not found" };
      }

      const ratings = await Rating.findAll({
        where: { product_id: productId },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      // Calculate average rating
      const avgRating =
        ratings.length > 0
          ? (
              ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
            ).toFixed(1)
          : 0;

      res.status(200).json({
        averageRating: Number(avgRating),
        totalRatings: ratings.length,
        ratings,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserOrderRatings(req, res, next) {
    try {
      const userId = req.user.id;
      const { orderId } = req.params;

      // Check if order exists and belongs to user
      const order = await Order.findOne({
        where: { id: orderId, user_id: userId },
      });
      if (!order) {
        throw { name: "NotFound", message: "Order not found" };
      }

      const ratings = await Rating.findAll({
        where: {
          order_id: orderId,
          user_id: userId,
        },
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "name", "image"],
          },
        ],
      });

      res.status(200).json(ratings);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UserController;
