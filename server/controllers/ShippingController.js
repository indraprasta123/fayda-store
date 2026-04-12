const { calculateShipping } = require("../services/shippingService");

class ShippingController {
  static async getShipping(req, res, next) {
    try {
      const { address } = req.body;

      if (!address) {
        throw { name: "BadRequest", message: "Alamat wajib diisi" };
      }

      const result = await calculateShipping(address);

      res.status(200).json({
        message: "Success get shipping cost",
        distance: result.distance,
        shippingCost: result.shippingCost,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ShippingController;
