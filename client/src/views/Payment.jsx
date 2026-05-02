import { animate } from "animejs";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";
import api from "../api/axios";
import Swal from "sweetalert2";

export default function Payment() {
  const { theme } = useSettings();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const deliveryInfo = JSON.parse(localStorage.getItem("deliveryInfo") || "{}");
  const cartItems = JSON.parse(localStorage.getItem("cart_items") || "[]");

  const totalPrice = useMemo(
    () =>
      cartItems.reduce(
        (acc, item) =>
          acc + Number(item.price || 0) * Number(item.quantity || 1),
        0,
      ),
    [cartItems],
  );

  const shippingCost = Number(deliveryInfo.shippingCost || 0);
  const shippingDistanceKm = Number(deliveryInfo.shippingDistanceKm || 0);
  const shippingBillableKm = Number(deliveryInfo.shippingBillableKm || 0);
  const shippingRatePerKm = Number(deliveryInfo.shippingRatePerKm || 0);
  const finalPaymentTotal = totalPrice + shippingCost;

  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [isLoading, setIsLoading] = useState(false);

  const headerRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
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

    if (contentRef.current) {
      animations.push(
        animate(contentRef.current, {
          opacity: [0, 1],
          y: [24, 0],
          delay: 150,
          duration: 900,
          easing: "outExpo",
        }),
      );
    }

    return () => {
      animations.forEach((animation) => animation.pause());
    };
  }, []);

  // =========================
  // HANDLE PAYMENT
  // =========================
  const handlePay = async () => {
    setIsLoading(true);

    try {
      // Create order first
      const orderResponse = await api.post("/pub/order/create", {
        deliveryInfo,
        paymentMethod,
        totalPrice: finalPaymentTotal,
        cartItems,
      });

      const { order } = orderResponse.data;

      if (paymentMethod === "cod") {
        // Save order to localStorage
        localStorage.setItem(
          "lastOrder",
          JSON.stringify({
            id: order.id,
            status: order.status,
            total: order.total_price,
            method: "COD",
            date: new Date().toLocaleDateString("id-ID"),
          }),
        );

        // Clear cart and delivery info
        localStorage.removeItem("cart_items");
        localStorage.removeItem("deliveryInfo");

        setIsLoading(false);

        // Redirect to success page
        Swal.fire({
          icon: "success",
          title: "Pesanan Berhasil Dibuat!",
          text: "Pesanan Anda telah dibuat. Silakan bayar di tempat (COD)",
          confirmButtonColor: isDark ? "#4f46e5" : "#f97316",
        }).then(() => {
          navigate("/riwayat-pesanan");
        });
        return;
      }

      // For Midtrans payment
      const paymentResponse = await api.post("/payment", {
        total_price: finalPaymentTotal,
        order_id: order.id,
      });

      if (!window.snap) {
        throw new Error("Midtrans tidak tersedia");
      }

      window.snap.pay(paymentResponse.data.token, {
        onSuccess: async function (result) {
          // Save order to localStorage
          localStorage.setItem(
            "lastOrder",
            JSON.stringify({
              id: order.id,
              status: "paid",
              total: order.total_price,
              method: "Midtrans",
              date: new Date().toLocaleDateString("id-ID"),
            }),
          );

          // Clear cart and delivery info
          localStorage.removeItem("cart_items");
          localStorage.removeItem("deliveryInfo");

          setIsLoading(false);

          Swal.fire({
            icon: "success",
            title: "Pembayaran Berhasil!",
            text: "Pesanan Anda sedang diproses",
            confirmButtonColor: isDark ? "#4f46e5" : "#f97316",
          }).then(() => {
            navigate("/payment-success", {
              state: { order, method: "midtrans", result },
            });
          });
        },
        onPending: function (result) {
          setIsLoading(false);
          Swal.fire({
            icon: "info",
            title: "Menunggu Pembayaran",
            text: "Pembayaran Anda sedang diproses",
            confirmButtonColor: isDark ? "#4f46e5" : "#f97316",
          });
        },
        onError: function (error) {
          setIsLoading(false);
          Swal.fire({
            icon: "error",
            title: "Pembayaran Gagal",
            text: "Pembayaran Anda gagal diproses",
            confirmButtonColor: isDark ? "#4f46e5" : "#f97316",
          });
        },
        onClose: function () {
          setIsLoading(false);
        },
      });
    } catch (error) {
      setIsLoading(false);
      Swal.fire({
        icon: "error",
        title: "Terjadi Kesalahan",
        text:
          error.response?.data?.message ||
          error.message ||
          "Gagal memproses pesanan",
        confirmButtonColor: isDark ? "#4f46e5" : "#f97316",
      });
    }
  };

  return (
    <div
      className={`min-h-screen p-4 md:p-6 transition-colors duration-300 ${
        isDark
          ? "bg-linear-to-br from-slate-950 via-slate-900 to-slate-950"
          : "bg-linear-to-br from-orange-50 via-white to-amber-50"
      }`}
    >
      <div className="mx-auto w-full max-w-4xl">
        <section
          ref={headerRef}
          className={`mb-6 rounded-2xl px-6 py-6 text-white shadow-lg ${
            isDark
              ? "bg-linear-to-r from-slate-800 via-slate-700 to-slate-800"
              : "bg-linear-to-r from-orange-500 via-orange-500 to-amber-500"
          }`}
        >
          <h1 className="text-3xl font-bold md:text-4xl">Payment</h1>
          <p className="mt-2 text-sm text-orange-50 md:text-base">
            Konfirmasi terakhir sebelum pembayaran diproses.
          </p>
        </section>

        <div
          ref={contentRef}
          className={`rounded-2xl p-5 shadow-sm ${
            isDark
              ? "border border-slate-700 bg-slate-900"
              : "border border-orange-100 bg-white"
          }`}
        >
          {/* DELIVERY */}
          <h2
            className={`text-lg font-semibold ${
              isDark ? "text-slate-100" : "text-slate-800"
            }`}
          >
            Delivery Summary
          </h2>

          <div
            className={`mt-3 space-y-1 text-sm ${
              isDark ? "text-slate-300" : "text-slate-600"
            }`}
          >
            <p>
              <span className="font-medium">Nama:</span>{" "}
              {deliveryInfo.name || "-"}
            </p>
            <p>
              <span className="font-medium">No HP:</span>{" "}
              {deliveryInfo.phone || "-"}
            </p>
            <p>
              <span className="font-medium">Alamat:</span>{" "}
              {deliveryInfo.address || "-"}
            </p>
            <p>
              <span className="font-medium">Lokasi:</span>{" "}
              {deliveryInfo.locationPoint || "-"}
            </p>
            <p>
              <span className="font-medium">Jarak ke Toko:</span>{" "}
              {shippingDistanceKm > 0
                ? `${shippingDistanceKm.toFixed(2)} km`
                : "-"}
            </p>
          </div>

          {/* TOTAL */}
          <div
            className={`mt-5 pt-4 ${
              isDark
                ? "border-t border-slate-700"
                : "border-t border-orange-100"
            }`}
          >
            <p
              className={`text-sm ${
                isDark ? "text-slate-300" : "text-slate-600"
              }`}
            >
              Subtotal Produk
            </p>
            <p
              className={`text-base font-semibold ${
                isDark ? "text-slate-100" : "text-slate-800"
              }`}
            >
              Rp {totalPrice.toLocaleString("id-ID")}
            </p>

            <p
              className={`mt-3 text-sm ${
                isDark ? "text-slate-300" : "text-slate-600"
              }`}
            >
              Ongkir
              {shippingRatePerKm > 0 && shippingBillableKm > 0
                ? ` (${shippingBillableKm} km × Rp ${shippingRatePerKm.toLocaleString("id-ID")}/km)`
                : shippingDistanceKm > 0
                  ? " (tarif bertingkat dari jarak rute)"
                  : ""}
            </p>
            <p
              className={`text-base font-semibold ${
                isDark ? "text-slate-100" : "text-slate-800"
              }`}
            >
              Rp {shippingCost.toLocaleString("id-ID")}
            </p>

            {shippingDistanceKm > 0 ? (
              <p
                className={`text-xs ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Jarak rute (pengemudi): {shippingDistanceKm.toFixed(2)} km
              </p>
            ) : null}

            <p
              className={`mt-3 text-sm ${
                isDark ? "text-slate-300" : "text-slate-600"
              }`}
            >
              Total Pembayaran
            </p>
            <p
              className={`text-2xl font-bold ${
                isDark ? "text-indigo-300" : "text-orange-600"
              }`}
            >
              Rp {finalPaymentTotal.toLocaleString("id-ID")}
            </p>
          </div>

          {/* PAYMENT METHOD */}
          <div className="mt-5">
            <p
              className={`text-sm font-medium mb-2 ${
                isDark ? "text-slate-200" : "text-slate-700"
              }`}
            >
              Metode Pembayaran
            </p>

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setPaymentMethod("cod")}
                disabled={isLoading}
                className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                  paymentMethod === "cod"
                    ? "bg-green-500 text-white border-green-500"
                    : isDark
                      ? "border-slate-600 text-slate-300 hover:border-slate-500"
                      : "border-gray-300 text-gray-700 hover:border-gray-400"
                } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                COD (Bayar di Tempat)
              </button>

              <button
                onClick={() => setPaymentMethod("midtrans")}
                disabled={isLoading}
                className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                  paymentMethod === "midtrans"
                    ? "bg-blue-500 text-white border-blue-500"
                    : isDark
                      ? "border-slate-600 text-slate-300 hover:border-slate-500"
                      : "border-gray-300 text-gray-700 hover:border-gray-400"
                } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Payment Gateway
              </button>
            </div>
          </div>

          {/* ACTION */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/confirm-delivery"
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                isDark
                  ? "border-slate-600 text-indigo-300 hover:bg-slate-800"
                  : "border-orange-200 text-orange-600 hover:bg-orange-50"
              } ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
            >
              Kembali
            </Link>

            <button
              onClick={handlePay}
              disabled={isLoading}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all ${
                isDark
                  ? "bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800"
                  : "bg-orange-500 hover:bg-orange-600 disabled:bg-orange-700"
              } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  Processing...
                </span>
              ) : (
                "Bayar Sekarang"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
