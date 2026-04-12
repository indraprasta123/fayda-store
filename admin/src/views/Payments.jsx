import { animate } from "animejs";
import { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import Sidebar from "../components/Sidebar";
import api from "../api/axios";

const PAYMENT_STATUS_OPTIONS = ["pending", "paid", "failed", "expired"];

const PAYMENT_STATUS_LABELS = {
  pending: "Menunggu",
  paid: "Dibayar",
  failed: "Gagal",
  expired: "Kadaluarsa",
};

const paymentStatusStyles = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  expired: "bg-slate-200 text-slate-700",
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

const toPaymentMethodLabel = (value) => {
  const normalized = String(value || "").toLowerCase();

  if (normalized === "cod" || normalized === "cash" || normalized === "tunai") {
    return "Tunai";
  }

  if (
    normalized === "midtrans" ||
    normalized === "online" ||
    normalized === "payment gateway" ||
    normalized === "gateway"
  ) {
    return "Pembayaran Online";
  }

  return value ? "Pembayaran Online" : "-";
};

const toPaymentStatusLabel = (value) =>
  PAYMENT_STATUS_LABELS[String(value || "").toLowerCase()] || value || "-";

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const headerRef = useRef(null);
  const cardRefs = useRef([]);
  const tableRef = useRef(null);

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      const { data } = await api.get("/admin/payments");
      setPayments(Array.isArray(data?.payments) ? data.payments : []);
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message || "Gagal mengambil data pembayaran",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
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
  }, [payments.length]);

  const filteredPayments = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return payments.filter((payment) => {
      const orderId = String(payment?.order_id || "");
      const transactionId = String(payment?.transaction_id || "");
      const userName = payment?.user?.name || payment?.order?.user?.name || "";
      const email = payment?.user?.email || payment?.order?.user?.email || "";

      const searchMatch =
        !normalizedSearch ||
        orderId.includes(normalizedSearch) ||
        transactionId.toLowerCase().includes(normalizedSearch) ||
        userName.toLowerCase().includes(normalizedSearch) ||
        email.toLowerCase().includes(normalizedSearch);

      const statusMatch =
        statusFilter === "all" ||
        String(payment?.payment_status || "").toLowerCase() === statusFilter;

      return searchMatch && statusMatch;
    });
  }, [payments, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = payments.length;
    const paid = payments.filter((p) => p.payment_status === "paid").length;
    const pending = payments.filter(
      (p) => p.payment_status === "pending",
    ).length;
    const totalAmount = payments.reduce(
      (acc, p) => acc + Number(p.gross_amount || 0),
      0,
    );

    return [
      {
        title: "Total Payments",
        value: total,
        accent: "from-orange-400 to-orange-500",
      },
      {
        title: "Dibayar",
        value: paid,
        accent: "from-emerald-400 to-emerald-500",
      },
      {
        title: "Menunggu",
        value: pending,
        accent: "from-amber-400 to-orange-500",
      },
      {
        title: "Gross Amount",
        value: toCurrency(totalAmount),
        accent: "from-orange-500 to-red-500",
      },
    ];
  }, [payments]);

  const handleUpdatePaymentStatus = async (orderId, nextStatus) => {
    try {
      await api.patch(`/admin/payments/${orderId}/status`, {
        payment_status: nextStatus,
      });

      setPayments((prev) =>
        prev.map((payment) =>
          Number(payment.order_id) === Number(orderId)
            ? {
                ...payment,
                payment_status: nextStatus,
                order: payment.order
                  ? { ...payment.order, payment_status: nextStatus }
                  : payment.order,
              }
            : payment,
        ),
      );

      Swal.fire("Berhasil", "Status pembayaran diperbarui", "success");
    } catch (error) {
      Swal.fire(
        "Gagal",
        error?.response?.data?.message ||
          "Tidak dapat memperbarui status pembayaran",
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
          <h1 className="text-3xl font-bold md:text-4xl">Payments</h1>
          <p className="mt-2 text-sm text-orange-50 md:text-base">
            Monitor semua transaksi pembayaran dan perbarui statusnya.
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
              Payment List
            </h2>

            <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
              <input
                type="text"
                placeholder="Cari Order/Transaksi/Nama"
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
                {PAYMENT_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {toPaymentStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Memuat data pembayaran...
            </div>
          ) : errorMessage ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Data pembayaran tidak ditemukan.
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
                        Method
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Transaction ID
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Amount
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
                    {filteredPayments.map((payment) => (
                      <tr
                        key={`${payment.id}-${payment.order_id}`}
                        className="border-b border-orange-50 align-top last:border-0"
                      >
                        <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                          #{payment.order_id}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          <p className="font-medium text-slate-800">
                            {payment?.user?.name ||
                              payment?.order?.user?.name ||
                              "-"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {payment?.user?.email ||
                              payment?.order?.user?.email ||
                              "-"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {toPaymentMethodLabel(payment.payment_type)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {payment.transaction_id || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                          {toCurrency(payment.gross_amount)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${paymentStatusStyles[payment.payment_status] || "bg-slate-100 text-slate-700"}`}
                          >
                            {toPaymentStatusLabel(payment.payment_status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {toDate(payment.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <select
                            value={payment.payment_status || "pending"}
                            onChange={(event) =>
                              handleUpdatePaymentStatus(
                                payment.order_id,
                                event.target.value,
                              )
                            }
                            className="rounded-lg border border-orange-200 px-2 py-1.5 text-xs outline-hidden focus:border-orange-400"
                          >
                            {PAYMENT_STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>
                                {toPaymentStatusLabel(status)}
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
                {filteredPayments.map((payment) => (
                  <article
                    key={`${payment.id}-${payment.order_id}-mobile`}
                    className="rounded-xl border border-orange-100 bg-orange-50/40 p-4"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Order #{payment.order_id}
                        </p>
                        <p className="text-xs text-slate-500">
                          {toDate(payment.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${paymentStatusStyles[payment.payment_status] || "bg-slate-100 text-slate-700"}`}
                      >
                        {toPaymentStatusLabel(payment.payment_status)}
                      </span>
                    </div>

                    <p className="text-sm text-slate-700">
                      <span className="font-medium">Customer:</span>{" "}
                      {payment?.user?.name || payment?.order?.user?.name || "-"}
                    </p>
                    <p className="text-sm text-slate-700">
                      <span className="font-medium">Method:</span>{" "}
                      {toPaymentMethodLabel(payment.payment_type)}
                    </p>
                    <p className="text-sm font-semibold text-slate-800">
                      <span className="font-medium">Amount:</span>{" "}
                      {toCurrency(payment.gross_amount)}
                    </p>

                    <div className="mt-3">
                      <select
                        value={payment.payment_status || "pending"}
                        onChange={(event) =>
                          handleUpdatePaymentStatus(
                            payment.order_id,
                            event.target.value,
                          )
                        }
                        className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm outline-hidden focus:border-orange-400"
                      >
                        {PAYMENT_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {toPaymentStatusLabel(status)}
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
