import { animate } from "animejs";
import { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import Sidebar from "../components/Sidebar";
import api from "../api/axios";
import socket from "../utils/socket";

const ORDER_STATUS_OPTIONS = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const ORDER_STATUS_LABELS = {
  pending: "Menunggu",
  processing: "Diproses",
  shipped: "Dikirim",
  delivered: "Selesai",
  cancelled: "Dibatalkan",
};

const statusStyles = {
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

const toCurrency = (value) =>
  `Rp ${Number(value || 0).toLocaleString("id-ID", {
    maximumFractionDigits: 0,
  })}`;

const toDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toOrderStatusLabel = (value) =>
  ORDER_STATUS_LABELS[String(value || "").toLowerCase()] || value || "-";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const headerRef = useRef(null);
  const cardRefs = useRef([]);
  const tableRef = useRef(null);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      const { data } = await api.get("/admin/orders");
      setOrders(Array.isArray(data?.orders) ? data.orders : []);
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message || "Gagal mengambil data order",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
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
    };

    const handleOrderCreated = () => {
      fetchOrders();
    };

    socket.on("order:status-updated", handleOrderStatusUpdated);
    socket.on("order:created", handleOrderCreated);

    return () => {
      socket.off("order:status-updated", handleOrderStatusUpdated);
      socket.off("order:created", handleOrderCreated);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      );
      if (reduceMotion.matches) return;
    }

    const animations = [];

    if (headerRef.current) {
      animations.push(
        animate(headerRef.current, {
          opacity: [0, 1],
          y: [20, 0],
          duration: 850,
          easing: "outExpo",
        }),
      );
    }

    if (cardRefs.current.length > 0) {
      animations.push(
        animate(cardRefs.current.filter(Boolean), {
          opacity: [0, 1],
          y: [18, 0],
          delay: (_, index) => 150 + index * 110,
          duration: 800,
          easing: "outExpo",
        }),
      );
    }

    if (tableRef.current) {
      animations.push(
        animate(tableRef.current, {
          opacity: [0, 1],
          y: [20, 0],
          delay: 250,
          duration: 900,
          easing: "outExpo",
        }),
      );
    }

    return () => {
      animations.forEach((animation) => animation.pause());
    };
  }, [orders.length]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const userName = order?.user?.name || "";
      const email = order?.user?.email || "";
      const id = String(order?.id || "");

      const searchMatch =
        !normalizedSearch ||
        userName.toLowerCase().includes(normalizedSearch) ||
        email.toLowerCase().includes(normalizedSearch) ||
        id.includes(normalizedSearch);

      const statusMatch =
        statusFilter === "all" ||
        String(order?.status || "").toLowerCase() === statusFilter;

      return searchMatch && statusMatch;
    });
  }, [orders, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === "pending").length;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const revenue = orders.reduce(
      (acc, o) => acc + Number(o.total_price || 0),
      0,
    );

    return [
      {
        title: "Total Orders",
        value: total,
        accent: "from-orange-400 to-orange-500",
      },
      {
        title: "Menunggu",
        value: pending,
        accent: "from-amber-400 to-orange-500",
      },
      {
        title: "Selesai",
        value: delivered,
        accent: "from-emerald-400 to-emerald-500",
      },
      {
        title: "Revenue",
        value: toCurrency(revenue),
        accent: "from-orange-500 to-red-500",
      },
    ];
  }, [orders]);

  const handleUpdateStatus = async (orderId, nextStatus) => {
    try {
      await api.patch(`/admin/orders/${orderId}/status`, {
        status: nextStatus,
      });
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: nextStatus } : order,
        ),
      );
      Swal.fire("Berhasil", "Status order diperbarui", "success");
    } catch (error) {
      Swal.fire(
        "Gagal",
        error?.response?.data?.message ||
          "Tidak dapat memperbarui status order",
        "error",
      );
    }
  };

  return (
    <div className="flex min-h-screen bg-linear-to-br from-orange-50 via-white to-amber-50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <section
          ref={headerRef}
          className="mb-8 rounded-2xl bg-linear-to-r from-orange-500 via-orange-500 to-amber-500 px-6 py-7 text-white shadow-lg"
        >
          <h1 className="text-3xl font-bold md:text-4xl">Orders</h1>
          <p className="mt-2 text-sm text-orange-50 md:text-base">
            Pantau dan kelola seluruh pesanan customer dengan cepat.
          </p>
        </section>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item, index) => (
            <div
              key={item.title}
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm"
            >
              <div
                className={`inline-flex rounded-full bg-linear-to-r px-3 py-1 text-xs font-semibold text-white ${item.accent}`}
              >
                {item.title}
              </div>
              <p className="mt-4 text-2xl font-bold text-slate-800">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div
          ref={tableRef}
          className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm"
        >
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-2xl font-semibold text-slate-800">
              Order List
            </h2>

            <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
              <input
                type="text"
                placeholder="Cari ID / Nama / Email"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded-lg border border-orange-200 px-3 py-2 text-sm outline-hidden focus:border-orange-400 md:w-64"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-lg border border-orange-200 px-3 py-2 text-sm outline-hidden focus:border-orange-400"
              >
                <option value="all">Semua Status</option>
                {ORDER_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {toOrderStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Memuat data order...
            </div>
          ) : errorMessage ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Data order tidak ditemukan.
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full overflow-hidden rounded-xl">
                  <thead className="bg-orange-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Order
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Customer
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Items
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Total
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-orange-50 align-top last:border-0"
                      >
                        <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                          #{order.id}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          <p className="font-medium text-slate-800">
                            {order?.user?.name || "-"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {order?.user?.email || "-"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {order?.items?.length || 0}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                          {toCurrency(order.total_price)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[order.status] || "bg-slate-100 text-slate-700"}`}
                          >
                            {toOrderStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {toDate(order.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <select
                            value={order.status || "pending"}
                            onChange={(event) =>
                              handleUpdateStatus(order.id, event.target.value)
                            }
                            className="rounded-lg border border-orange-200 px-2 py-1.5 text-xs outline-hidden focus:border-orange-400"
                          >
                            {ORDER_STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>
                                {toOrderStatusLabel(status)}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 lg:hidden">
                {filteredOrders.map((order) => (
                  <article
                    key={order.id}
                    className="rounded-xl border border-orange-100 bg-orange-50/40 p-4"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Order #{order.id}
                        </p>
                        <p className="text-xs text-slate-500">
                          {toDate(order.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[order.status] || "bg-slate-100 text-slate-700"}`}
                      >
                        {toOrderStatusLabel(order.status)}
                      </span>
                    </div>

                    <p className="text-sm text-slate-700">
                      <span className="font-medium">Customer:</span>{" "}
                      {order?.user?.name || "-"}
                    </p>
                    <p className="text-sm text-slate-700">
                      <span className="font-medium">Items:</span>{" "}
                      {order?.items?.length || 0}
                    </p>
                    <p className="text-sm font-semibold text-slate-800">
                      <span className="font-medium">Total:</span>{" "}
                      {toCurrency(order.total_price)}
                    </p>

                    <div className="mt-3">
                      <select
                        value={order.status || "pending"}
                        onChange={(event) =>
                          handleUpdateStatus(order.id, event.target.value)
                        }
                        className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm outline-hidden focus:border-orange-400"
                      >
                        {ORDER_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {toOrderStatusLabel(status)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
