import { animate } from "animejs";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Sidebar from "../components/Sidebar";
import api from "../api/axios";

const PERIOD_OPTIONS = [
  { value: "day", label: "Per Hari" },
  { value: "month", label: "Per Bulan" },
  { value: "year", label: "Per Tahun" },
];

const TOP_SCOPE_OPTIONS = [
  { value: "day", label: "Hari Ini" },
  { value: "month", label: "Bulan Ini" },
  { value: "year", label: "Tahun Ini" },
];

const ORDER_SCOPE_OPTIONS = [
  { value: "sales", label: "Order selesai saja (penjualan)" },
  { value: "all", label: "Semua status" },
];

const statusLabel = {
  pending: "Pending",
  processing: "Diproses",
  shipped: "Dikirim",
  delivered: "Selesai",
  cancelled: "Batal",
};

const statusClassName = {
  delivered: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  shipped: "bg-indigo-100 text-indigo-700",
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

const toInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function RecapReport() {
  const [period, setPeriod] = useState("day");
  const [selectedDate, setSelectedDate] = useState(toInputDate(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(
    String(new Date().getMonth() + 1),
  );
  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear()),
  );
  const [topScope, setTopScope] = useState("day");
  const [orderScope, setOrderScope] = useState("sales");

  const [summary, setSummary] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalItemsSold: 0,
  });
  const [orders, setOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const headerRef = useRef(null);
  const filterCardRef = useRef(null);
  const statRefs = useRef([]);
  const orderTableRef = useRef(null);
  const topProductTableRef = useRef(null);

  const statItems = useMemo(
    () => [
      {
        title: "Total Order",
        value: Number(summary.totalOrders || 0).toLocaleString("id-ID"),
        accent: "from-orange-400 to-orange-500",
      },
      {
        title: "Total Item Terjual",
        value: Number(summary.totalItemsSold || 0).toLocaleString("id-ID"),
        accent: "from-amber-400 to-orange-500",
      },
      {
        title: "Total Revenue",
        value: toCurrency(summary.totalRevenue || 0),
        accent: "from-orange-500 to-red-500",
      },
    ],
    [summary],
  );

  const fetchRecapReport = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const params = {
        period,
        topScope,
        ...(orderScope === "all" ? { orderScope: "all" } : {}),
      };

      if (period === "day") {
        params.date = selectedDate;
      } else if (period === "month") {
        params.month = selectedMonth;
        params.year = selectedYear;
      } else {
        params.year = selectedYear;
      }

      const { data } = await api.get("/admin/reports/recap", { params });

      setSummary(data?.summary || {});
      setOrders(Array.isArray(data?.orders) ? data.orders : []);
      setTopProducts(Array.isArray(data?.topProducts) ? data.topProducts : []);
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message || "Gagal mengambil data rekap laporan",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecapReport();
  }, [
    period,
    selectedDate,
    selectedMonth,
    selectedYear,
    topScope,
    orderScope,
  ]);

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

    if (filterCardRef.current) {
      animations.push(
        animate(filterCardRef.current, {
          opacity: [0, 1],
          y: [20, 0],
          delay: 120,
          duration: 780,
          easing: "outExpo",
        }),
      );
    }

    if (statRefs.current.length > 0) {
      animations.push(
        animate(statRefs.current.filter(Boolean), {
          opacity: [0, 1],
          y: [18, 0],
          delay: (_, index) => 180 + index * 110,
          duration: 750,
          easing: "outExpo",
        }),
      );
    }

    if (orderTableRef.current) {
      animations.push(
        animate(orderTableRef.current, {
          opacity: [0, 1],
          y: [22, 0],
          delay: 250,
          duration: 850,
          easing: "outExpo",
        }),
      );
    }

    if (topProductTableRef.current) {
      animations.push(
        animate(topProductTableRef.current, {
          opacity: [0, 1],
          y: [22, 0],
          delay: 300,
          duration: 850,
          easing: "outExpo",
        }),
      );
    }

    return () => {
      animations.forEach((animation) => animation.pause());
    };
  }, [summary.totalOrders, orders.length, topProducts.length]);

  const exportToExcel = () => {
    const orderSheet = XLSX.utils.json_to_sheet(
      orders.map((order) => ({
        "Order ID": order.id,
        User: order.user,
        Email: order.email,
        "Total Item": order.itemCount,
        Total: Number(order.total || 0),
        Status:
          statusLabel[String(order.status || "").toLowerCase()] || order.status,
        Tanggal: toDate(order.date),
      })),
    );

    const topProductSheet = XLSX.utils.json_to_sheet(
      topProducts.map((product, index) => ({
        Ranking: index + 1,
        Produk: product.name,
        "Qty Terjual": product.totalQty,
        Revenue: Number(product.totalRevenue || 0),
      })),
    );

    const summarySheet = XLSX.utils.json_to_sheet([
      {
        "Total Order": summary.totalOrders || 0,
        "Total Item Terjual": summary.totalItemsSold || 0,
        "Total Revenue": Number(summary.totalRevenue || 0),
        Cakupan:
          orderScope === "all"
            ? "Semua status"
            : "Order selesai (delivered) saja",
      },
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
    XLSX.utils.book_append_sheet(workbook, orderSheet, "Orders");
    XLSX.utils.book_append_sheet(workbook, topProductSheet, "Top Products");

    XLSX.writeFile(workbook, `recap-report-${Date.now()}.xlsx`);
  };

  const exportToPdf = () => {
    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.text("Rekap Laporan Penjualan", 14, 16);

    doc.setFontSize(10);
    const scopeLine =
      orderScope === "all"
        ? "Cakupan: semua status order"
        : "Cakupan: order selesai (delivered) saja";
    doc.text(scopeLine, 14, 22);
    doc.text(
      `Total Order: ${summary.totalOrders || 0} | Total Item: ${summary.totalItemsSold || 0} | Revenue: ${toCurrency(summary.totalRevenue || 0)}`,
      14,
      28,
    );

    autoTable(doc, {
      startY: 34,
      head: [["Order ID", "User", "Item", "Total", "Status", "Tanggal"]],
      body: orders.map((order) => [
        `#${order.id}`,
        order.user,
        String(order.itemCount || 0),
        toCurrency(order.total),
        statusLabel[String(order.status || "").toLowerCase()] || order.status,
        toDate(order.date),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [249, 115, 22] },
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [["#", "Produk", "Qty Terjual", "Revenue"]],
      body: topProducts.map((product, index) => [
        String(index + 1),
        product.name,
        String(product.totalQty || 0),
        toCurrency(product.totalRevenue || 0),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [245, 158, 11] },
    });

    doc.save(`recap-report-${Date.now()}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 print:bg-white">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-6 md:p-8 print:p-0">
        <section
          ref={headerRef}
          className="mb-8 rounded-2xl bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 px-6 py-7 text-white shadow-lg print:rounded-none print:bg-white print:px-0 print:py-3 print:text-slate-900 print:shadow-none"
        >
          <h1 className="text-3xl font-bold md:text-4xl">
            Rekap Laporan Penjualan
          </h1>
          <p className="mt-2 text-sm text-orange-50 md:text-base print:text-slate-600">
            Laporan penjualan per hari, per bulan, per tahun, plus produk
            terlaris.
          </p>
        </section>

        <div
          ref={filterCardRef}
          className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm print:hidden"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="rounded-lg border border-orange-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {period === "day" ? (
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="rounded-lg border border-orange-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
              />
            ) : null}

            {period === "month" ? (
              <>
                <select
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className="rounded-lg border border-orange-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
                >
                  {Array.from({ length: 12 }, (_, index) => index + 1).map(
                    (month) => (
                      <option key={month} value={String(month)}>
                        Bulan {month}
                      </option>
                    ),
                  )}
                </select>
                <input
                  type="number"
                  value={selectedYear}
                  onChange={(event) => setSelectedYear(event.target.value)}
                  className="rounded-lg border border-orange-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
                  min="2020"
                  max="2100"
                />
              </>
            ) : null}

            {period === "year" ? (
              <input
                type="number"
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
                className="rounded-lg border border-orange-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
                min="2020"
                max="2100"
              />
            ) : null}

            <select
              value={topScope}
              onChange={(event) => setTopScope(event.target.value)}
              className="rounded-lg border border-orange-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
            >
              {TOP_SCOPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  Produk Terlaris {option.label}
                </option>
              ))}
            </select>

            <select
              value={orderScope}
              onChange={(event) => setOrderScope(event.target.value)}
              className="rounded-lg border border-orange-200 px-3 py-2 text-sm outline-none focus:border-orange-400 md:col-span-2 xl:col-span-1"
            >
              {ORDER_SCOPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <p className="mt-3 text-xs text-slate-600 print:hidden">
            {orderScope === "sales"
              ? "Ringkasan dan daftar order mengikuti status Selesai saja. Pilih “Semua status” untuk audit lengkap."
              : "Semua status order dimasukkan ke ringkasan dan tabel."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportToExcel}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              Export Excel
            </button>
            <button
              type="button"
              onClick={exportToPdf}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
            >
              Export PDF
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Print
            </button>
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {statItems.map((item, index) => (
            <div
              key={item.title}
              ref={(element) => {
                statRefs.current[index] = element;
              }}
              className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm"
            >
              <div
                className={`inline-flex rounded-full bg-gradient-to-r px-3 py-1 text-xs font-semibold text-white ${item.accent}`}
              >
                {item.title}
              </div>
              <p className="mt-4 text-3xl font-bold text-slate-800">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div
          ref={orderTableRef}
          className="mt-6 rounded-2xl border border-orange-100 bg-white p-5 shadow-sm"
        >
          <h2 className="mb-4 text-2xl font-semibold text-slate-800">
            Data Order
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full overflow-hidden rounded-xl">
              <thead className="bg-orange-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Order ID
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Item
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Tanggal
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-4 text-sm text-slate-500"
                    >
                      Memuat data order...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-4 text-sm text-slate-500"
                    >
                      Tidak ada data order pada periode ini.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const normalizedStatus = String(
                      order.status || "",
                    ).toLowerCase();

                    return (
                      <tr
                        key={order.id}
                        className="border-b border-orange-50 last:border-0"
                      >
                        <td className="px-4 py-3 text-sm text-slate-700">
                          #{order.id}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {order.user}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {order.email}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {order.itemCount}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                          {toCurrency(order.total)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName[normalizedStatus] || "bg-slate-100 text-slate-700"}`}
                          >
                            {statusLabel[normalizedStatus] ||
                              order.status ||
                              "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {toDate(order.date)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div
          ref={topProductTableRef}
          className="mt-6 rounded-2xl border border-orange-100 bg-white p-5 shadow-sm"
        >
          <h2 className="mb-4 text-2xl font-semibold text-slate-800">
            Produk Terlaris
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full overflow-hidden rounded-xl">
              <thead className="bg-orange-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Produk
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Qty Terjual
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-4 text-sm text-slate-500"
                    >
                      Memuat produk terlaris...
                    </td>
                  </tr>
                ) : topProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-4 text-sm text-slate-500"
                    >
                      Belum ada produk terlaris pada periode ini.
                    </td>
                  </tr>
                ) : (
                  topProducts.map((product, index) => (
                    <tr
                      key={product.id}
                      className="border-b border-orange-50 last:border-0"
                    >
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">
                        {product.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {product.totalQty}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                        {toCurrency(product.totalRevenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
