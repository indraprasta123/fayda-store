const axios = require("axios");

// =====================
// GET COORDINATE
// =====================
const getCoordinates = async (address) => {
  const { data } = await axios.get(
    "https://nominatim.openstreetmap.org/search",
    {
      params: {
        q: address,
        format: "json",
      },
    },
  );

  if (!data.length) {
    throw { name: "BadRequest", message: "Alamat tidak ditemukan" };
  }

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
  };
};

// =====================
// GET DISTANCE
// =====================
const getDistance = async (start, end) => {
  const url = "https://api.openrouteservice.org/v2/directions/driving-car";

  const { data } = await axios.post(
    url,
    {
      coordinates: [
        [start.lng, start.lat],
        [end.lng, end.lat],
      ],
    },
    {
      headers: {
        Authorization: process.env.ORS_API_KEY,
        "Content-Type": "application/json",
      },
    },
  );

  const distance = data.routes[0].summary.distance; // meter
  return distance / 1000; // km
};

// =====================
// MAIN FUNCTION
// =====================
const calculateShipping = async (address) => {
  // 1. Ambil koordinat user
  const userCoord = await getCoordinates(address);

  // 2. Koordinat toko dari .env
  const storeCoord = {
    lat: parseFloat(process.env.STORE_LAT),
    lng: parseFloat(process.env.STORE_LNG),
  };

  // 3. Hitung jarak
  const distance = await getDistance(storeCoord, userCoord);

  // =====================
  // VALIDASI JARAK
  // =====================
  if (distance > 30) {
    throw {
      name: "BadRequest",
      message: "Maksimal jarak pengiriman 30 km",
    };
  }

  // =====================
  // HITUNG ONGKIR (TIER)
  // =====================
  let shippingCost = 0;

  if (distance <= 10) {
    shippingCost = Math.ceil(distance) * 1000;
  } else {
    shippingCost = 10 * 1000 + Math.ceil(distance - 10) * 2000;
  }

  // minimum ongkir
  const minShipping = 8000;
  shippingCost = Math.max(shippingCost, minShipping);

  return {
    distance: Number(distance.toFixed(2)),
    shippingCost,
  };
};

module.exports = { calculateShipping };
