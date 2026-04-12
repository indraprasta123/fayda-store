const snap = require("../config/midtrans");

class PaymentController {
  static async createTransaction(req, res, next) {
    try {
      const { total_price, order_id } = req.body;

      if (!total_price) {
        throw { name: "BadRequest", message: "Total price is required" };
      }

      const parameter = {
        transaction_details: {
          order_id: `ORDER-${order_id || Date.now()}`,
          gross_amount: total_price,
        },
        customer_details: {
          first_name: req.user?.name || "User",
          email: req.user?.email || "user@unknown.com",
        },
      };

      const transaction = await snap.createTransaction(parameter);

      res.json({
        token: transaction.token,
        transaction_id: transaction.transaction_id,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PaymentController;
