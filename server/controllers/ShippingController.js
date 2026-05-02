const {
  calculateShipping,
  calculateShippingFromLatLng,
} = require("../services/shippingService");

class ShippingController {
  static async getShipping(req, res, next) {
    try {
      const body = req.body || {};
      const { address } = body;

      // Terima lat/lng (atau latitude/longitude) sebagai angka — hindari cek String(..).trim() pada nilai non-string
      const latRaw =
        body.lat ?? body.latitude ?? body.Lat ?? body.Latitude;
      const lngRaw =
        body.lng ?? body.longitude ?? body.lon ?? body.Lng ?? body.Longitude;

      const latNum =
        latRaw !== undefined && latRaw !== null && latRaw !== ""
          ? Number(latRaw)
          : NaN;
      const lngNum =
        lngRaw !== undefined && lngRaw !== null && lngRaw !== ""
          ? Number(lngRaw)
          : NaN;

      const hasCoords = Number.isFinite(latNum) && Number.isFinite(lngNum);

      let result;

      if (hasCoords) {
        result = await calculateShippingFromLatLng(latNum, lngNum);
      } else if (address && String(address).trim()) {
        result = await calculateShipping(String(address).trim());
      } else {
        throw {
          name: "BadRequest",
          message:
            "Kirim koordinat lat & lng (atau latitude & longitude), atau alamat teks lengkap",
        };
      }

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
