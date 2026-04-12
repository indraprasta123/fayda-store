import Sidebar from "../components/Sidebar";
import { animate } from "animejs";
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/axios";
import socket from "../utils/socket";

export default function Dashboard() {
  const [overview, setOverview] = useState({
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [dailyOrders, setDailyOrders] = useState([]);
  const [todayOrders, setTodayOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const headerRef = useRef(null);
  const statCardRefs = useRef([]);
  const monthlyTableRef = useRef(null);
  const dailyTableRef = useRef(null);
  const recentTableRef = useRef(null);

  const monthlyChartData = useMemo(() => {
    const ordered = [...monthlyStats].sort((a, b) =>
      a.monthKey.localeCompare(b.monthKey),
    );

    const chartWidth = 640;
    const chartHeight = 220;
    const paddingX = 26;
    const paddingY = 26;

    if (ordered.length === 0) {
      return {
        linePath: "",
        points: [],
        width: chartWidth,
        height: chartHeight,
      };
    }

    const values = ordered.map((item) => Number(item.revenue || 0));
    const maxValue = Math.max(...values, 1);

    const points = ordered.map((item, index) => {
      const x =
        ordered.length === 1
          ? chartWidth / 2
          : paddingX +
            (index * (chartWidth - paddingX * 2)) / (ordered.length - 1);

      const y =
        chartHeight -
        paddingY -
        (Number(item.revenue || 0) / maxValue) * (chartHeight - paddingY * 2);

      return {
        ...item,
        x,
        y,
      };
    });

    const linePath = points
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
      .join(" ");

    return {
      linePath,
      points,
      width: chartWidth,
      height: chartHeight,
    };
  }, [monthlyStats]);

  const statItems = useMemo(
    () => [
      {
        title: "Total Users",
        value: Number(overview.totalUsers || 0).toLocaleString("id-ID"),
        accent: "from-orange-400 to-orange-500",
      },
      {
        title: "Total Orders",
        value: Number(overview.totalOrders || 0).toLocaleString("id-ID"),
        accent: "from-amber-400 to-orange-500",
      },
      {
        title: "Revenue",
        value: `Rp ${Number(overview.totalRevenue || 0).toLocaleString(
          "id-ID",
          {
            maximumFractionDigits: 0,
          },
        )}`,
        accent: "from-orange-500 to-red-500",
      },
    ],
    [overview],
  );

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

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const { data } = await api.get("/admin/dashboard/stats");
      setOverview(data?.overview || {});
      setMonthlyStats(
        Array.isArray(data?.monthlyStats) ? data.monthlyStats : [],
      );
      setDailyOrders(Array.isArray(data?.dailyOrders) ? data.dailyOrders : []);
      setTodayOrders(Array.isArray(data?.todayOrders) ? data.todayOrders : []);
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message || "Gagal mengambil data dashboard",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    const handleRefresh = () => {
      fetchDashboard();
    };

    socket.on("dashboard:refresh", handleRefresh);
    socket.on("order:created", handleRefresh);
    socket.on("order:status-updated", handleRefresh);

    return () => {
      socket.off("dashboard:refresh", handleRefresh);
      socket.off("order:created", handleRefresh);
      socket.off("order:status-updated", handleRefresh);
    };
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

    if (statCardRefs.current.length > 0) {
      animations.push(
        animate(statCardRefs.current.filter(Boolean), {
          opacity: [0, 1],
          y: [22, 0],
          scale: [0.97, 1],
          delay: (_, index) => 180 + index * 140,
          duration: 900,
          easing: "outExpo",
        }),
      );
    }

    if (monthlyTableRef.current) {
      animations.push(
        animate(monthlyTableRef.current, {
          opacity: [0, 1],
          y: [24, 0],
          delay: 280,
          duration: 900,
          easing: "outExpo",
        }),
      );
    }

    if (dailyTableRef.current) {
      animations.push(
        animate(dailyTableRef.current, {
          opacity: [0, 1],
          y: [24, 0],
          delay: 340,
          duration: 900,
          easing: "outExpo",
        }),
      );
    }

    if (recentTableRef.current) {
      animations.push(
        animate(recentTableRef.current, {
          opacity: [0, 1],
          y: [24, 0],
          delay: 380,
          duration: 900,
          easing: "outExpo",
        }),
      );
    }

    return () => {
      animations.forEach((animation) => animation.pause());
    };
  }, [
    statItems.length,
    monthlyStats.length,
    dailyOrders.length,
    todayOrders.length,
  ]);

  return (
    <div className="flex min-h-screen bg-linear-to-br from-orange-50 via-white to-amber-50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <section
          ref={headerRef}
          className="mb-8 rounded-2xl bg-linear-to-r from-orange-500 via-orange-500 to-amber-500 px-6 py-7 text-white shadow-lg"
        >
          <h1 className="text-3xl font-bold md:text-4xl">Dashboard Admin</h1>
          <p className="mt-2 text-sm text-orange-50 md:text-base">
            Pantau performa toko, transaksi, dan aktivitas terbaru dari satu
            tempat.
          </p>
        </section>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {statItems.map((item, index) => (
            <div
              key={item.title}
              ref={(element) => {
                statCardRefs.current[index] = element;
              }}
              className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div
                className={`inline-flex rounded-full bg-linear-to-r px-3 py-1 text-xs font-semibold text-white ${item.accent}`}
              >
                {item.title}
              </div>
              <p className="mt-4 text-3xl font-bold text-slate-800">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {errorMessage ? (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div
            ref={monthlyTableRef}
            className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm"
          >
            <h2 className="mb-4 text-xl font-semibold text-slate-800">
              Laporan Statistik Bulanan
            </h2>
            <div className="mb-5 rounded-xl border border-orange-100 bg-orange-50/40 p-3">
              <svg
                viewBox={`0 0 ${monthlyChartData.width} ${monthlyChartData.height}`}
                className="h-52 w-full"
                role="img"
                aria-label="Diagram garis revenue bulanan"
              >
                <path
                  d={`M26,194 L614,194`}
                  stroke="#fed7aa"
                  strokeWidth="1"
                  fill="none"
                />

                {monthlyChartData.linePath ? (
                  <>
                    <path
                      d={monthlyChartData.linePath}
                      stroke="#f97316"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {monthlyChartData.points.map((point) => (
                      <g key={point.monthKey}>
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="4"
                          fill="#f97316"
                        />
                        <text
                          x={point.x}
                          y={point.y - 10}
                          textAnchor="middle"
                          fontSize="11"
                          fill="#9a3412"
                        >
                          {Math.round(Number(point.revenue || 0) / 1000)}k
                        </text>
                        <text
                          x={point.x}
                          y={208}
                          textAnchor="middle"
                          fontSize="11"
                          fill="#6b7280"
                        >
                          {point.monthLabel}
                        </text>
                      </g>
                    ))}
                  </>
                ) : null}
              </svg>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full overflow-hidden rounded-xl">
                <thead className="bg-orange-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Bulan
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Total Order
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
                        colSpan={3}
                        className="px-4 py-4 text-sm text-slate-500"
                      >
                        Memuat data bulanan...
                      </td>
                    </tr>
                  ) : monthlyStats.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-4 text-sm text-slate-500"
                      >
                        Belum ada data bulanan.
                      </td>
                    </tr>
                  ) : (
                    monthlyStats.map((item) => (
                      <tr
                        key={item.monthKey}
                        className="border-b border-orange-50 last:border-0"
                      >
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {item.monthLabel}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {item.totalOrders}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                          {toCurrency(item.revenue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div
            ref={dailyTableRef}
            className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm"
          >
            <h2 className="mb-4 text-xl font-semibold text-slate-800">
              Order Masuk Per Hari
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full overflow-hidden rounded-xl">
                <thead className="bg-orange-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Tanggal
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Total Order
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
                        colSpan={3}
                        className="px-4 py-4 text-sm text-slate-500"
                      >
                        Memuat data harian...
                      </td>
                    </tr>
                  ) : dailyOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-4 text-sm text-slate-500"
                      >
                        Belum ada data order harian.
                      </td>
                    </tr>
                  ) : (
                    dailyOrders.map((item) => (
                      <tr
                        key={item.date}
                        className="border-b border-orange-50 last:border-0"
                      >
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {item.date}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {item.totalOrders}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                          {toCurrency(item.revenue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div
          ref={recentTableRef}
          className="mt-6 rounded-2xl border border-orange-100 bg-white p-5 shadow-sm"
        >
          <h2 className="mb-4 text-2xl font-semibold text-slate-800">
            Order Hari Ini
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
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-4 text-sm text-slate-500"
                    >
                      Memuat order hari ini...
                    </td>
                  </tr>
                ) : todayOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-4 text-sm text-slate-500"
                    >
                      Belum ada order masuk hari ini.
                    </td>
                  </tr>
                ) : (
                  todayOrders.map((order) => {
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
      </main>
    </div>
  );
}
