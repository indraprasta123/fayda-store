import { animate } from "animejs";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";
import api from "../api/axios";
import Swal from "sweetalert2";
import socket from "../utils/socket";

export default function RiwayatPesanan() {
  const { theme } = useSettings();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [ratingData, setRatingData] = useState({});
  const [submittedRatings, setSubmittedRatings] = useState({});

  const headerRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchOrders();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const handleConnect = () => {
      socket.emit("join-user-room", token);
    };

    const handleOrderStatusUpdated = (payload) => {
      const { orderId, status, paymentStatus, updatedAt } = payload || {};
      if (!orderId || !status) return;

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status,
                payment_status: paymentStatus ?? order.payment_status,
                updatedAt: updatedAt || order.updatedAt,
              }
            : order,
        ),
      );

      setSelectedOrder((prevSelected) =>
        prevSelected?.id === orderId
          ? {
              ...prevSelected,
              status,
              payment_status: paymentStatus ?? prevSelected.payment_status,
              updatedAt: updatedAt || prevSelected.updatedAt,
            }
          : prevSelected,
      );
    };

    socket.on("connect", handleConnect);
    socket.on("order:status-updated", handleOrderStatusUpdated);

    if (!socket.connected) {
      socket.connect();
    } else {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("order:status-updated", handleOrderStatusUpdated);
    };
  }, []);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get("/pub/orders");
      const orderList = data || [];
      setOrders(orderList);

      const deliveredOrders = orderList.filter(
        (order) => order?.status === "delivered",
      );

      if (deliveredOrders.length > 0) {
        const ratingResponses = await Promise.all(
          deliveredOrders.map(async (order) => {
            try {
              const response = await api.get(`/pub/ratings/order/${order.id}`);
              return { orderId: order.id, ratings: response.data || [] };
            } catch {
              return { orderId: order.id, ratings: [] };
            }
          }),
        );

        const submittedMap = {};
        ratingResponses.forEach(({ orderId, ratings }) => {
          ratings.forEach((item) => {
            submittedMap[`${orderId}_${item.product_id}`] = {
              rating: Number(item.rating || 0),
              review: item.review || "",
            };
          });
        });

        setSubmittedRatings(submittedMap);
      } else {
        setSubmittedRatings({});
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal Memuat Pesanan",
        text: error.response?.data?.message || "Terjadi kesalahan",
        confirmButtonColor: isDark ? "#4f46e5" : "#f97316",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitRating = async (productId, orderId) => {
    try {
      const rating = ratingData[`product_${productId}`];
      const review = ratingData[`review_${productId}`] || "";

      if (!rating) {
        Swal.fire({
          icon: "warning",
          title: "Pilih Rating",
          text: "Silakan pilih bintang sebelum mengirim",
          confirmButtonColor: isDark ? "#4f46e5" : "#f97316",
        });
        return;
      }

      const response = await api.post("/pub/rating", {
        productId,
        orderId,
        rating,
        review,
      });

      setSubmittedRatings((prev) => ({
        ...prev,
        [`${orderId}_${productId}`]: {
          rating,
          review,
        },
      }));

      Swal.fire({
        icon: "success",
        title: "Rating Berhasil",
        text: "Terima kasih telah memberikan rating!",
        confirmButtonColor: isDark ? "#4f46e5" : "#f97316",
      });

      // Clear the rating data for this product
      setRatingData((prev) => ({
        ...prev,
        [`product_${productId}`]: 0,
        [`review_${productId}`]: "",
      }));
    } catch (error) {
      console.error("Error submitting rating:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal Mengirim Rating",
        text:
          error.response?.data?.message ||
          "Anda sudah memberikan rating untuk produk ini atau pesanan belum selesai",
        confirmButtonColor: isDark ? "#4f46e5" : "#f97316",
      });
    }
  };

  useEffect(() => {
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

    return () => animations.forEach((a) => a.pause());
  }, []);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return isDark
          ? "bg-yellow-900/30 text-yellow-300"
          : "bg-yellow-50 text-yellow-700";
      case "processing":
        return isDark
          ? "bg-blue-900/30 text-blue-300"
          : "bg-blue-50 text-blue-700";
      case "shipped":
        return isDark
          ? "bg-purple-900/30 text-purple-300"
          : "bg-purple-50 text-purple-700";
      case "delivered":
        return isDark
          ? "bg-green-900/30 text-green-300"
          : "bg-green-50 text-green-700";
      case "cancelled":
        return isDark ? "bg-red-900/30 text-red-300" : "bg-red-50 text-red-700";
      default:
        return isDark
          ? "bg-slate-800 text-slate-300"
          : "bg-slate-100 text-slate-700";
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: "Menunggu Konfirmasi",
      processing: "Sedang Diproses",
      shipped: "Sedang Dikirim",
      delivered: "Tiba",
      cancelled: "Dibatalkan",
    };
    return labels[status?.toLowerCase()] || status || "Unknown";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPaymentMethodLabel = (method) => {
    const normalizedMethod = String(method || "").toLowerCase();

    if (
      normalizedMethod === "cod" ||
      normalizedMethod === "cash" ||
      normalizedMethod === "tunai"
    ) {
      return "Tunai";
    }

    if (
      normalizedMethod === "midtrans" ||
      normalizedMethod === "online" ||
      normalizedMethod === "payment gateway" ||
      normalizedMethod === "gateway"
    ) {
      return "Pembayaran Online";
    }

    return method || "-";
  };

  return (
    <div
      className={`min-h-screen p-4 md:p-6 transition-colors duration-300 ${
        isDark
          ? "bg-linear-to-br from-slate-950 via-slate-900 to-slate-950"
          : "bg-linear-to-br from-orange-50 via-white to-amber-50"
      }`}
    >
      <div className="mx-auto max-w-5xl">
        {/* HEADER */}
        <section
          ref={headerRef}
          className={`mb-6 rounded-2xl px-6 py-8 text-white shadow-lg ${
            isDark
              ? "bg-linear-to-r from-slate-800 to-slate-700"
              : "bg-linear-to-r from-orange-500 to-amber-500"
          }`}
        >
          <h1 className="text-3xl font-bold md:text-4xl">Riwayat Pesanan</h1>
          <p className="mt-2 text-sm md:text-base text-orange-50">
            Semua pesanan yang pernah kamu lakukan
          </p>
        </section>

        {/* CONTENT */}
        <div
          ref={contentRef}
          className={`rounded-2xl p-5 md:p-6 shadow-sm ${
            isDark
              ? "bg-slate-900 border border-slate-700"
              : "bg-white border border-orange-100"
          }`}
        >
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-orange-500 mb-3"></div>
                <p
                  className={`text-sm ${
                    isDark ? "text-slate-400" : "text-gray-500"
                  }`}
                >
                  Memuat pesanan...
                </p>
              </div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📭</div>
              <p
                className={`text-sm font-medium ${
                  isDark ? "text-slate-300" : "text-gray-700"
                }`}
              >
                Belum ada pesanan
              </p>
              <p
                className={`text-xs mt-1 ${
                  isDark ? "text-slate-400" : "text-gray-500"
                }`}
              >
                Silakan mulai berbelanja untuk membuat pesanan
              </p>
              <button
                onClick={() => navigate("/")}
                className={`mt-4 rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                  isDark
                    ? "bg-indigo-600 hover:bg-indigo-700"
                    : "bg-orange-500 hover:bg-orange-600"
                }`}
              >
                Belanja Sekarang
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className={`p-4 md:p-5 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                    isDark
                      ? "border-slate-700 hover:border-slate-600"
                      : "border-orange-100 hover:border-orange-200"
                  } ${selectedOrder?.id === order.id ? (isDark ? "bg-slate-800 border-slate-600" : "bg-orange-50 border-orange-300") : ""}`}
                  onClick={() =>
                    setSelectedOrder(
                      selectedOrder?.id === order.id ? null : order,
                    )
                  }
                >
                  {/* HEADER ROW */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
                    <div className="flex-1">
                      <p
                        className={`font-semibold text-lg ${
                          isDark ? "text-slate-100" : "text-slate-800"
                        }`}
                      >
                        Pesanan #{order.id}
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          isDark ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        {formatDate(order.createdAt)}
                      </p>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                      {/* STATUS BADGE */}
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium w-fit ${getStatusColor(
                          order.status,
                        )}`}
                      >
                        {getStatusLabel(order.status)}
                      </span>

                      {/* TOTAL PRICE */}
                      <p
                        className={`font-bold text-lg ${
                          isDark ? "text-indigo-300" : "text-orange-600"
                        }`}
                      >
                        Rp{" "}
                        {Number(order.total_price || 0).toLocaleString("id-ID")}
                      </p>

                      {/* EXPAND BUTTON */}
                      <svg
                        className={`h-5 w-5 transition-transform ${
                          selectedOrder?.id === order.id ? "rotate-180" : ""
                        } ${isDark ? "text-slate-400" : "text-slate-500"}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 14l-7 7m0 0l-7-7m7 7V3"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* DETAILED CONTENT - EXPANDABLE  */}
                  {selectedOrder?.id === order.id && (
                    <div
                      className="mt-4 space-y-3 border-t pt-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {order.payment_method && (
                        <div className="flex justify-between">
                          <p
                            className={`text-sm ${
                              isDark ? "text-slate-400" : "text-slate-600"
                            }`}
                          >
                            Metode Pembayaran
                          </p>
                          <p
                            className={`text-sm font-medium ${
                              isDark ? "text-slate-200" : "text-slate-800"
                            }`}
                          >
                            {getPaymentMethodLabel(order.payment_method)}
                          </p>
                        </div>
                      )}

                      {/* ITEMS LIST */}
                      {order.items && order.items.length > 0 && (
                        <div>
                          <p
                            className={`text-sm font-medium mb-2 ${
                              isDark ? "text-slate-300" : "text-slate-700"
                            }`}
                          >
                            Item Pesanan ({order.items.length})
                          </p>
                          <div className="space-y-2">
                            {order.items.map((item) => (
                              <div
                                key={item.id}
                                className={`p-2 rounded-lg text-sm ${
                                  isDark ? "bg-slate-800/50" : "bg-orange-50/50"
                                }`}
                              >
                                <p
                                  className={`font-medium ${
                                    isDark ? "text-slate-200" : "text-slate-800"
                                  }`}
                                >
                                  {item.product?.name || "Produk"}
                                </p>
                                <p
                                  className={`text-xs mt-1 ${
                                    isDark ? "text-slate-400" : "text-slate-600"
                                  }`}
                                >
                                  Qty: {item.quantity} × Rp{" "}
                                  {Number(item.price || 0).toLocaleString(
                                    "id-ID",
                                  )}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ACTION BUTTONS OR RATING */}
                      {order.status === "delivered" ? (
                        <div className="pt-2 space-y-3 border-t">
                          <p
                            className={`text-sm font-medium ${
                              isDark ? "text-slate-300" : "text-slate-700"
                            }`}
                          >
                            Berikan Rating untuk Produk
                          </p>
                          {order.items && order.items.length > 0 && (
                            <div className="space-y-3">
                              {order.items.map((item) => (
                                <div
                                  key={item.id}
                                  className={`p-3 rounded-lg border ${
                                    isDark
                                      ? "border-slate-600 bg-slate-800/50"
                                      : "border-orange-100 bg-orange-50"
                                  }`}
                                >
                                  <p
                                    className={`font-medium text-sm mb-2 ${
                                      isDark
                                        ? "text-slate-200"
                                        : "text-slate-800"
                                    }`}
                                  >
                                    {item.product?.name || "Produk"}
                                  </p>
                                  {submittedRatings[
                                    `${order.id}_${item.product_id}`
                                  ] ? (
                                    <div className="space-y-1">
                                      <p
                                        className={`text-xs font-medium ${
                                          isDark
                                            ? "text-emerald-300"
                                            : "text-emerald-700"
                                        }`}
                                      >
                                        Sudah dirating
                                      </p>
                                      <div className="text-lg">
                                        {"⭐".repeat(
                                          submittedRatings[
                                            `${order.id}_${item.product_id}`
                                          ].rating,
                                        )}
                                      </div>
                                      {submittedRatings[
                                        `${order.id}_${item.product_id}`
                                      ].review ? (
                                        <p
                                          className={`text-xs ${
                                            isDark
                                              ? "text-slate-300"
                                              : "text-slate-600"
                                          }`}
                                        >
                                          “
                                          {
                                            submittedRatings[
                                              `${order.id}_${item.product_id}`
                                            ].review
                                          }
                                          ”
                                        </p>
                                      ) : null}
                                    </div>
                                  ) : (
                                    <>
                                      {/* STAR RATING */}
                                      <div className="flex gap-1 mb-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                          <button
                                            key={star}
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setRatingData((prev) => ({
                                                ...prev,
                                                [`product_${item.product_id}`]:
                                                  star,
                                              }));
                                            }}
                                            className="text-xl transition-transform hover:scale-110"
                                          >
                                            {star <=
                                            (ratingData[
                                              `product_${item.product_id}`
                                            ] || 0)
                                              ? "⭐"
                                              : "☆"}
                                          </button>
                                        ))}
                                      </div>

                                      {/* REVIEW TEXT */}
                                      <textarea
                                        placeholder="Tulis ulasan (opsional)"
                                        value={
                                          ratingData[
                                            `review_${item.product_id}`
                                          ] || ""
                                        }
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) =>
                                          setRatingData((prev) => ({
                                            ...prev,
                                            [`review_${item.product_id}`]:
                                              e.target.value,
                                          }))
                                        }
                                        className={`w-full text-sm p-2 rounded border resize-none focus:outline-none focus:ring-2 ${
                                          isDark
                                            ? "bg-slate-700 border-slate-600 text-slate-100 focus:ring-indigo-500"
                                            : "bg-white border-orange-200 text-slate-800 focus:ring-orange-500"
                                        }`}
                                        rows="2"
                                      />

                                      {/* SUBMIT BUTTON */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSubmitRating(
                                            item.product_id,
                                            order.id,
                                          );
                                        }}
                                        disabled={
                                          !ratingData[
                                            `product_${item.product_id}`
                                          ]
                                        }
                                        className={`w-full mt-2 rounded-lg py-2 text-sm font-semibold transition-all ${
                                          ratingData[
                                            `product_${item.product_id}`
                                          ]
                                            ? isDark
                                              ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                                              : "bg-orange-500 hover:bg-orange-600 text-white"
                                            : isDark
                                              ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                                              : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                        }`}
                                      >
                                        Kirim Rating
                                      </button>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-2 pt-2">
                          <button
                            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                              isDark
                                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                                : "bg-orange-500 hover:bg-orange-600 text-white"
                            }`}
                          >
                            Detail Pesanan
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* BACK BUTTON */}
        {!isLoading && orders.length > 0 && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => navigate("/")}
              className={`rounded-lg border px-6 py-2 font-medium transition-all ${
                isDark
                  ? "border-slate-600 text-indigo-400 hover:bg-slate-800"
                  : "border-orange-200 text-orange-600 hover:bg-orange-50"
              }`}
            >
              Kembali ke Beranda
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
