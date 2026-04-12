import { animate } from "animejs";
import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";

export default function PaymentSuccess() {
  const { theme } = useSettings();
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const location = useLocation();

  const order =
    location.state?.order ||
    JSON.parse(localStorage.getItem("lastOrder") || "{}");
  const method = location.state?.method || "unknown";
  const resolvedMethod = order.method || order.payment_method || method;

  const headerRef = useRef(null);
  const contentRef = useRef(null);
  const detailsRef = useRef(null);

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

    if (detailsRef.current) {
      animations.push(
        animate(detailsRef.current, {
          opacity: [0, 1],
          y: [24, 0],
          delay: 300,
          duration: 900,
          easing: "outExpo",
        }),
      );
    }

    return () => animations.forEach((a) => a.pause());
  }, []);

  return (
    <div
      className={`min-h-screen p-4 md:p-6 transition-colors duration-300 ${
        isDark
          ? "bg-linear-to-br from-slate-950 via-slate-900 to-slate-950"
          : "bg-linear-to-br from-orange-50 via-white to-amber-50"
      }`}
    >
      <div className="mx-auto max-w-3xl">
        {/* HEADER - SUCCESS */}
        <section
          ref={headerRef}
          className={`mb-6 rounded-2xl px-6 py-8 text-white shadow-lg ${
            isDark
              ? "bg-linear-to-r from-green-700 to-green-600"
              : "bg-linear-to-r from-green-500 to-emerald-500"
          }`}
        >
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div
                className={`rounded-full p-4 ${
                  isDark ? "bg-green-600" : "bg-green-400"
                }`}
              >
                <svg
                  className="h-8 w-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold md:text-4xl">
              Pembayaran Berhasil! 🎉
            </h1>
            <p className="mt-2 text-sm md:text-base text-green-50">
              Terima kasih! Pesanan Anda telah dikonfirmasi dan sedang diproses.
            </p>
          </div>
        </section>

        {/* CONTENT - ORDER DETAILS */}
        <div
          ref={contentRef}
          className={`rounded-2xl p-6 mb-6 shadow-sm ${
            isDark
              ? "bg-slate-900 border border-slate-700"
              : "bg-white border border-orange-100"
          }`}
        >
          <h2
            className={`text-lg font-semibold mb-4 ${
              isDark ? "text-slate-100" : "text-slate-800"
            }`}
          >
            Informasi Pesanan
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Order ID */}
            <div
              className={`p-4 rounded-lg ${
                isDark
                  ? "bg-slate-800 border border-slate-700"
                  : "bg-orange-50 border border-orange-100"
              }`}
            >
              <p
                className={`text-sm ${
                  isDark ? "text-slate-400" : "text-orange-700"
                }`}
              >
                Nomor Pesanan
              </p>
              <p
                className={`text-lg font-bold mt-1 ${
                  isDark ? "text-slate-100" : "text-slate-800"
                }`}
              >
                #{order.id || "Loading..."}
              </p>
            </div>

            {/* Order Status */}
            <div
              className={`p-4 rounded-lg ${
                isDark
                  ? "bg-slate-800 border border-slate-700"
                  : "bg-orange-50 border border-orange-100"
              }`}
            >
              <p
                className={`text-sm ${
                  isDark ? "text-slate-400" : "text-orange-700"
                }`}
              >
                Status Pesanan
              </p>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                <p
                  className={`text-lg font-bold ${
                    isDark ? "text-slate-100" : "text-slate-800"
                  }`}
                >
                  {order.status === "pending"
                    ? "Menunggu Konfirmasi"
                    : "Diproses"}
                </p>
              </div>
            </div>

            {/* Total Price */}
            <div
              className={`p-4 rounded-lg ${
                isDark
                  ? "bg-slate-800 border border-slate-700"
                  : "bg-orange-50 border border-orange-100"
              }`}
            >
              <p
                className={`text-sm ${
                  isDark ? "text-slate-400" : "text-orange-700"
                }`}
              >
                Total Pembayaran
              </p>
              <p
                className={`text-lg font-bold mt-1 ${
                  isDark ? "text-indigo-300" : "text-orange-600"
                }`}
              >
                Rp{" "}
                {Number(order.total_price || order.total || 0).toLocaleString(
                  "id-ID",
                )}
              </p>
            </div>

            {/* Payment Method */}
            <div
              className={`p-4 rounded-lg ${
                isDark
                  ? "bg-slate-800 border border-slate-700"
                  : "bg-orange-50 border border-orange-100"
              }`}
            >
              <p
                className={`text-sm ${
                  isDark ? "text-slate-400" : "text-orange-700"
                }`}
              >
                Metode Pembayaran
              </p>
              <p
                className={`text-lg font-bold mt-1 ${
                  isDark ? "text-slate-100" : "text-slate-800"
                }`}
              >
                {String(resolvedMethod).toLowerCase() === "cod"
                  ? "COD (Bayar di Tempat)"
                  : "Payment Gateway"}
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div
            className={`mt-6 p-4 rounded-lg border-l-4 ${
              isDark
                ? "border-l-blue-500 bg-blue-900/30 text-blue-300"
                : "border-l-blue-500 bg-blue-50 text-blue-700"
            }`}
          >
            <p className="text-sm font-medium">
              ℹ️ Pesanan Anda akan diproses dalam 1-2 jam. Silakan tunggu
              konfirmasi dari admin.
            </p>
            {method === "cod" && (
              <p className="text-sm mt-2">
                💳 Untuk metode COD, barang akan tiba dalam 2-3 hari kerja.
                Bayar saat barang sampai.
              </p>
            )}
          </div>
        </div>

        {/* NEXT AS STEPS */}
        <div
          ref={detailsRef}
          className={`rounded-2xl p-6 mb-6 shadow-sm ${
            isDark
              ? "bg-slate-900 border border-slate-700"
              : "bg-white border border-orange-100"
          }`}
        >
          <h3
            className={`text-lg font-semibold mb-4 ${
              isDark ? "text-slate-100" : "text-slate-800"
            }`}
          >
            Langkah Selanjutnya
          </h3>

          <div className="space-y-3">
            <div className="flex gap-3">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold ${
                  isDark ? "bg-indigo-600" : "bg-orange-500"
                }`}
              >
                1
              </div>
              <div>
                <p
                  className={`font-medium ${
                    isDark ? "text-slate-100" : "text-slate-800"
                  }`}
                >
                  Tunggu Konfirmasi
                </p>
                <p
                  className={`text-sm ${
                    isDark ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  Admin akan mengkonfirmasi pesanan Anda dalam 1-2 jam
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold ${
                  isDark ? "bg-indigo-600" : "bg-orange-500"
                }`}
              >
                2
              </div>
              <div>
                <p
                  className={`font-medium ${
                    isDark ? "text-slate-100" : "text-slate-800"
                  }`}
                >
                  Barang Dikemas
                </p>
                <p
                  className={`text-sm ${
                    isDark ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  Setelah konfirmasi, barang akan dikemas dan disiapkan untuk
                  pengiriman
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold ${
                  isDark ? "bg-indigo-600" : "bg-orange-500"
                }`}
              >
                3
              </div>
              <div>
                <p
                  className={`font-medium ${
                    isDark ? "text-slate-100" : "text-slate-800"
                  }`}
                >
                  Barang Dikirim
                </p>
                <p
                  className={`text-sm ${
                    isDark ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  Barang akan dikirim ke alamat Anda. Anda akan menerima
                  notifikasi pengiriman
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* BUTTONS */}
        <div className="flex gap-3 flex-col md:flex-row">
          <button
            onClick={() => navigate("/riwayat-pesanan")}
            className={`flex-1 rounded-lg py-3 text-white font-semibold transition-all ${
              isDark
                ? "bg-indigo-600 hover:bg-indigo-700"
                : "bg-orange-500 hover:bg-orange-600"
            }`}
          >
            Lihat Riwayat Pesanan
          </button>

          <button
            onClick={() => navigate("/home")}
            className={`flex-1 rounded-lg py-3 font-semibold transition-all ${
              isDark
                ? "border border-slate-600 text-indigo-400 hover:bg-slate-800"
                : "border border-orange-200 text-orange-600 hover:bg-orange-50"
            }`}
          >
            Lanjut Belanja
          </button>
        </div>
      </div>
    </div>
  );
}
