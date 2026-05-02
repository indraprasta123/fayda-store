const axios = require("axios");

const MAX_DELIVERY_KM = Number(process.env.MAX_DELIVERY_DISTANCE_KM || 20);

// =====================
// GET COORDINATE (geocode alamat teks)
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
// GET DISTANCE (jalur mengemudi, meter → km)
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

const getStoreCoord = () => {
  const lat = parseFloat(process.env.STORE_LAT);
  const lng = parseFloat(process.env.STORE_LNG);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw {
      name: "InternalServerError",
      message: "Konfigurasi koordinat toko tidak valid",
    };
  }
  return { lat, lng };
};

// =====================
// HITUNG ONGKIR DARI JARAK (km)
// =====================
function finalizeShipping(distance) {
  if (distance > MAX_DELIVERY_KM) {
    throw {
      name: "BadRequest",
      message: `Maksimal jarak pengiriman ${MAX_DELIVERY_KM} km`,
    };
  }

  // Tarif bertingkat:
  // — sampai 10 km: Rp 1.000 × km dibulatkan ke bawah (2,2 km → 2 km → Rp 2.000); minima 1 km jika jarak > 0
  // — di atas 10 km: 10 km pertama @ Rp 1.000/km + sisa @ Rp 2.000/km (sisa km dibulatkan ke atas)
  let shippingCost = 0;

  if (distance <= 10) {
    const billedKm =
      distance > 0 ? Math.max(1, Math.floor(distance)) : 0;
    shippingCost = billedKm * 1000;
  } else {
    shippingCost =
      10 * 1000 + Math.ceil(distance - 10) * 2000;
  }

  return {
    distance: Number(distance.toFixed(2)),
    shippingCost,
  };
}

/**
 * Satu sumber kebenaran ongkir: jarak rute mengemudi (ORS) dari koordinat pengguna ke toko.
 */
async function calculateShippingFromLatLng(lat, lng) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw { name: "BadRequest", message: "Koordinat tidak valid" };
  }

  const storeCoord = getStoreCoord();
  const userCoord = { lat: latitude, lng: longitude };
  const distance = await getDistance(storeCoord, userCoord);

  return finalizeShipping(distance);
}

/**
 * Ongkir dari alamat teks (geocode dulu, lalu sama seperti koordinat).
 */
async function calculateShipping(address) {
  const userCoord = await getCoordinates(address);
  const storeCoord = getStoreCoord();
  const distance = await getDistance(storeCoord, userCoord);

  return finalizeShipping(distance);
}

module.exports = {
  calculateShipping,
  calculateShippingFromLatLng,
};
