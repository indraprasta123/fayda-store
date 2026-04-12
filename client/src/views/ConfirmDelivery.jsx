import { animate } from "animejs";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { readCartItems } from "../utils/cartStorage";
import { useSettings } from "../context/SettingsContext";

const STORE_LAT = Number(import.meta.env.VITE_STORE_LAT || -6.261492);
const STORE_LNG = Number(import.meta.env.VITE_STORE_LNG || 106.842827);

const calculateDistanceKm = (userLat, userLng, storeLat, storeLng) => {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const latitudeDiff = toRadians(storeLat - userLat);
  const longitudeDiff = toRadians(storeLng - userLng);
  const latitudeStart = toRadians(userLat);
  const latitudeEnd = toRadians(storeLat);

  const a =
    Math.sin(latitudeDiff / 2) ** 2 +
    Math.cos(latitudeStart) *
      Math.cos(latitudeEnd) *
      Math.sin(longitudeDiff / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

export default function ConfirmDelivery() {
  const navigate = useNavigate();
  const { theme } = useSettings();
  const isDark = theme === "dark";
  const [cartItems, setCartItems] = useState([]);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [hasAutoLocation, setHasAutoLocation] = useState(false);
  const headerRef = useRef(null);
  const formRef = useRef(null);
  const summaryRef = useRef(null);

  const [recipient, setRecipient] = useState({
    name: "",
    phone: "",
    address: "",
    locationPoint: "",
    lat: "",
    lng: "",
  });

  const mapEmbedUrl = useMemo(() => {
    if (!recipient.lat || !recipient.lng) return "";

    const latitude = Number(recipient.lat);
    const longitude = Number(recipient.lng);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return "";

    const delta = 0.01;
    const left = longitude - delta;
    const right = longitude + delta;
    const top = latitude + delta;
    const bottom = latitude - delta;

    return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${latitude}%2C${longitude}`;
  }, [recipient.lat, recipient.lng]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setCartItems(readCartItems());
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      );
      if (reduceMotion.matches) {
        return;
      }
    }

    const animations = [];

    if (headerRef.current) {
      animations.push(
        animate(headerRef.current, {
          opacity: [0, 1],
          y: [20, 0],
          duration: 900,
          easing: "outExpo",
        }),
      );
    }

    if (formRef.current) {
      animations.push(
        animate(formRef.current, {
          opacity: [0, 1],
          y: [24, 0],
          delay: 150,
          duration: 900,
          easing: "outExpo",
        }),
      );
    }

    if (summaryRef.current) {
      animations.push(
        animate(summaryRef.current, {
          opacity: [0, 1],
          y: [24, 0],
          delay: 250,
          duration: 900,
          easing: "outExpo",
        }),
      );
    }

    return () => {
      animations.forEach((animation) => animation.pause());
    };
  }, []);

  const handleChange = (e) => {
    setRecipient({ ...recipient, [e.target.name]: e.target.value });
  };

  const handleGetLocation = async () => {
    if (!navigator.geolocation) {
      Swal.fire("Error", "Geolocation not supported", "error");
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        let locationName = "Lokasi ditemukan";

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
          );
          const data = await response.json();
          const address = data?.address || {};

          locationName =
            address.suburb ||
            address.village ||
            address.town ||
            address.city ||
            address.county ||
            data?.display_name ||
            "Lokasi ditemukan";
        } catch {
          locationName = "Lokasi ditemukan";
        }

        setRecipient((prev) => ({
          ...prev,
          locationPoint: locationName,
          lat: latitude,
          lng: longitude,
        }));
        setHasAutoLocation(true);

        setIsGettingLocation(false);
        Swal.fire("Success", "Lokasi berhasil diambil", "success");
      },
      (error) => {
        setHasAutoLocation(false);
        setIsGettingLocation(false);
        let errorText = "Gagal mengambil lokasi";

        if (error?.code === 1) errorText = "Izin lokasi ditolak";
        if (error?.code === 2) errorText = "Lokasi tidak tersedia";
        if (error?.code === 3) errorText = "Waktu permintaan lokasi habis";

        Swal.fire("Error", errorText, "error");
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
      },
    );
  };

  const handleProceedPayment = () => {
    const { name, phone, address, locationPoint, lat, lng } = recipient;
    if (!name || !phone || !address || !locationPoint || !lat || !lng) {
      Swal.fire("Warning", "Lengkapi semua data penerima", "warning");
      return;
    }

    if (!hasAutoLocation) {
      Swal.fire(
        "Warning",
        "Klik Ambil Lokasi Otomatis terlebih dahulu untuk menghitung ongkir",
        "warning",
      );
      return;
    }

    localStorage.setItem(
      "deliveryInfo",
      JSON.stringify({
        ...recipient,
        shippingDistanceKm: Number(shippingInfo.distanceKm.toFixed(2)),
        shippingBillableKm: shippingInfo.billableKm,
        shippingRatePerKm: shippingInfo.ratePerKm,
        shippingCost: shippingInfo.shippingCost,
        subtotalPrice: normalizedTotalPrice,
        grandTotal,
      }),
    );
    navigate("/payment");
  };

  const normalizedCart = useMemo(
    () =>
      cartItems.map((item) => ({
        ...item,
        qty: item.quantity || item.qty || 1,
      })),
    [cartItems],
  );

  const normalizedTotalPrice = useMemo(
    () => normalizedCart.reduce((acc, item) => acc + item.price * item.qty, 0),
    [normalizedCart],
  );

  const totalItems = useMemo(
    () => normalizedCart.reduce((acc, item) => acc + Number(item.qty || 0), 0),
    [normalizedCart],
  );

  const shippingInfo = useMemo(() => {
    if (!hasAutoLocation) {
      return {
        distanceKm: 0,
        billableKm: 0,
        ratePerKm: 0,
        shippingCost: 0,
      };
    }

    const latitude = Number(recipient.lat);
    const longitude = Number(recipient.lng);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return {
        distanceKm: 0,
        billableKm: 0,
        ratePerKm: 0,
        shippingCost: 0,
      };
    }

    const distanceKm = calculateDistanceKm(
      latitude,
      longitude,
      STORE_LAT,
      STORE_LNG,
    );
    const ratePerKm = distanceKm > 10 ? 2000 : 1000;
    const billableKm = distanceKm > 0 ? Math.max(1, Math.floor(distanceKm)) : 0;
    const shippingCost = billableKm * ratePerKm;

    return {
      distanceKm,
      billableKm,
      ratePerKm,
      shippingCost,
    };
  }, [recipient.lat, recipient.lng, hasAutoLocation]);

  const grandTotal = useMemo(
    () => normalizedTotalPrice + shippingInfo.shippingCost,
    [normalizedTotalPrice, shippingInfo.shippingCost],
  );

  return (
    <div
      className={`min-h-screen p-4 md:p-6 transition-colors duration-300 ${
        isDark
          ? "bg-linear-to-br from-slate-950 via-slate-900 to-slate-950"
          : "bg-linear-to-br from-orange-50 via-white to-amber-50"
      }`}
    >
      <div className="mx-auto w-full max-w-6xl">
        <section
          ref={headerRef}
          className={`mb-6 rounded-2xl px-6 py-6 text-white shadow-lg ${
            isDark
              ? "bg-linear-to-r from-slate-800 via-slate-700 to-slate-800"
              : "bg-linear-to-r from-orange-500 via-orange-500 to-amber-500"
          }`}
        >
          <h1 className="text-3xl font-bold md:text-4xl">Confirm Delivery</h1>
          <p className="mt-2 text-sm text-orange-50 md:text-base">
            Lengkapi detail alamat pengiriman sebelum lanjut ke pembayaran.
          </p>
        </section>

        {normalizedCart.length === 0 ? (
          <div
            className={`rounded-2xl px-6 py-14 text-center shadow-sm ${
              isDark
                ? "border border-slate-700 bg-slate-900"
                : "border border-orange-100 bg-white"
            }`}
          >
            <p className={isDark ? "text-slate-300" : "text-slate-500"}>
              Keranjang Anda kosong.
            </p>
            <Link
              to="/home"
              className={`mt-4 inline-flex rounded-lg px-4 py-2 text-sm font-medium text-white transition ${
                isDark
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "bg-orange-500 hover:bg-orange-600"
              }`}
            >
              Kembali Belanja
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div
              ref={formRef}
              className={`rounded-2xl p-5 shadow-sm lg:col-span-2 ${
                isDark
                  ? "border border-slate-700 bg-slate-900"
                  : "border border-orange-100 bg-white"
              }`}
            >
              <h2
                className={`mb-4 text-lg font-semibold ${
                  isDark ? "text-slate-100" : "text-slate-800"
                }`}
              >
                Data Penerima
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label
                    className={`mb-1 block text-sm font-medium ${
                      isDark ? "text-slate-200" : "text-slate-700"
                    }`}
                  >
                    Nama Penerima
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={recipient.name}
                    onChange={handleChange}
                    className={`w-full rounded-lg px-3 py-2 text-sm outline-none ${
                      isDark
                        ? "border border-slate-700 bg-slate-800 text-slate-100 focus:border-indigo-400"
                        : "border border-orange-100 focus:border-orange-300"
                    }`}
                  />
                </div>

                <div>
                  <label
                    className={`mb-1 block text-sm font-medium ${
                      isDark ? "text-slate-200" : "text-slate-700"
                    }`}
                  >
                    Nomor HP
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={recipient.phone}
                    onChange={handleChange}
                    className={`w-full rounded-lg px-3 py-2 text-sm outline-none ${
                      isDark
                        ? "border border-slate-700 bg-slate-800 text-slate-100 focus:border-indigo-400"
                        : "border border-orange-100 focus:border-orange-300"
                    }`}
                  />
                </div>

                <div>
                  <label
                    className={`mb-1 block text-sm font-medium ${
                      isDark ? "text-slate-200" : "text-slate-700"
                    }`}
                  >
                    Titik Lokasi
                  </label>
                  <input
                    type="text"
                    name="locationPoint"
                    value={recipient.locationPoint}
                    onChange={handleChange}
                    className={`w-full rounded-lg px-3 py-2 text-sm outline-none ${
                      isDark
                        ? "border border-slate-700 bg-slate-800 text-slate-100 focus:border-indigo-400"
                        : "border border-orange-100 focus:border-orange-300"
                    }`}
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    className={`mb-1 block text-sm font-medium ${
                      isDark ? "text-slate-200" : "text-slate-700"
                    }`}
                  >
                    Alamat Lengkap
                  </label>
                  <textarea
                    name="address"
                    value={recipient.address}
                    onChange={handleChange}
                    rows={4}
                    className={`w-full rounded-lg px-3 py-2 text-sm outline-none ${
                      isDark
                        ? "border border-slate-700 bg-slate-800 text-slate-100 focus:border-indigo-400"
                        : "border border-orange-100 focus:border-orange-300"
                    }`}
                  ></textarea>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isGettingLocation}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    isDark
                      ? "border-slate-600 text-indigo-300 hover:bg-slate-800"
                      : "border-orange-200 text-orange-600 hover:bg-orange-50"
                  }`}
                >
                  {isGettingLocation
                    ? "Mengambil Lokasi..."
                    : "Ambil Lokasi Otomatis"}
                </button>
                {recipient.locationPoint ? (
                  <p className="text-xs text-emerald-600">
                    Titik lokasi: {recipient.locationPoint}
                  </p>
                ) : null}
              </div>

              {mapEmbedUrl ? (
                <div
                  className={`mt-4 overflow-hidden rounded-xl ${
                    isDark
                      ? "border border-slate-700"
                      : "border border-orange-100"
                  }`}
                >
                  <iframe
                    title="Lokasi Pengiriman"
                    src={mapEmbedUrl}
                    className="h-64 w-full"
                    loading="lazy"
                  />
                </div>
              ) : null}

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleProceedPayment}
                  className={`rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition ${
                    isDark
                      ? "bg-indigo-600 hover:bg-indigo-700"
                      : "bg-orange-500 hover:bg-orange-600"
                  }`}
                >
                  Lanjut ke Pembayaran
                </button>
              </div>
            </div>

            <aside
              ref={summaryRef}
              className={`h-fit rounded-2xl p-5 shadow-sm ${
                isDark
                  ? "border border-slate-700 bg-slate-900"
                  : "border border-orange-100 bg-white"
              }`}
            >
              <h2
                className={`text-lg font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}
              >
                Ringkasan Pesanan
              </h2>
              <div className="mt-4 space-y-3">
                {normalizedCart.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start justify-between gap-3 pb-2 last:border-0 ${
                      isDark
                        ? "border-b border-slate-800"
                        : "border-b border-orange-50"
                    }`}
                  >
                    <div className="min-w-0">
                      <p
                        className={`truncate text-sm font-medium ${
                          isDark ? "text-slate-200" : "text-slate-700"
                        }`}
                      >
                        {item.name}
                      </p>
                      <p
                        className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
                      >
                        Qty {item.qty}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}
                    >
                      Rp {(item.price * item.qty).toLocaleString("id-ID")}
                    </p>
                  </div>
                ))}
              </div>

              <div
                className={`mt-4 space-y-2 pt-3 text-sm ${
                  isDark
                    ? "border-t border-slate-700"
                    : "border-t border-orange-100"
                }`}
              >
                <div
                  className={`flex items-center justify-between ${
                    isDark ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  <span>Total Item</span>
                  <span
                    className={`font-medium ${isDark ? "text-slate-100" : "text-slate-800"}`}
                  >
                    {totalItems}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className={`${isDark ? "text-slate-300" : "text-slate-600"}`}
                  >
                    Subtotal Produk
                  </span>
                  <span
                    className={`font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}
                  >
                    Rp {normalizedTotalPrice.toLocaleString("id-ID")}
                  </span>
                </div>

                <div
                  className={`flex items-center justify-between ${
                    isDark ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  <span>
                    Ongkir
                    {shippingInfo.billableKm > 0
                      ? ` (${shippingInfo.billableKm} km × Rp ${shippingInfo.ratePerKm.toLocaleString("id-ID")}/km)`
                      : " (klik Ambil Lokasi Otomatis)"}
                  </span>
                  <span
                    className={`font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}
                  >
                    Rp {shippingInfo.shippingCost.toLocaleString("id-ID")}
                  </span>
                </div>

                {shippingInfo.distanceKm > 0 ? (
                  <p
                    className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
                  >
                    Jarak aktual: {shippingInfo.distanceKm.toFixed(2)} km
                  </p>
                ) : null}

                <div
                  className={`flex items-center justify-between pt-2 ${
                    isDark
                      ? "border-t border-slate-700"
                      : "border-t border-orange-100"
                  }`}
                >
                  <span
                    className={`font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}
                  >
                    Total Harga
                  </span>
                  <span
                    className={`text-base font-bold ${isDark ? "text-indigo-300" : "text-orange-600"}`}
                  >
                    Rp {grandTotal.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
