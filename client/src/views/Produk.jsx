import { animate } from "animejs";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import api from "../api/axios";
import { useSettings } from "../context/SettingsContext";
import { addToCart } from "../utils/cartStorage";
import socket from "../utils/socket";

const formatRupiah = (value) =>
  `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

export default function Produk() {
  const navigate = useNavigate();
  const { theme } = useSettings();
  const isDark = theme === "dark";

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceSort, setPriceSort] = useState("bestSeller");
  const [productRatings, setProductRatings] = useState({});

  const heroRef = useRef(null);
  const statRefs = useRef([]);
  const cardRefs = useRef([]);
  const infoRefs = useRef([]);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const { data } = await api.get("/pub/products");
      setProducts(Array.isArray(data) ? data : []);

      // Fetch ratings for all products
      if (Array.isArray(data) && data.length > 0) {
        const ratingsMap = {};
        await Promise.all(
          data.map(async (product) => {
            try {
              const { data: ratingData } = await api.get(
                `/pub/ratings/product/${product.id}`,
              );
              ratingsMap[product.id] = ratingData;
            } catch (error) {
              console.warn(`Failed to fetch ratings for product ${product.id}`);
            }
          }),
        );
        setProductRatings(ratingsMap);
      }
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message || "Gagal mengambil data produk",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    loadProducts();
  }, []);

  useEffect(() => {
    const handleProductSync = () => {
      loadProducts();
    };

    socket.on("product:sync", handleProductSync);

    return () => {
      socket.off("product:sync", handleProductSync);
    };
  }, []);

  useEffect(() => {
    const animations = [];

    if (heroRef.current) {
      animations.push(
        animate(heroRef.current, {
          opacity: [0, 1],
          y: [24, 0],
          duration: 1000,
          easing: "outExpo",
        }),
      );
    }

    const visibleStats = statRefs.current.filter(Boolean);
    if (visibleStats.length > 0) {
      animations.push(
        animate(visibleStats, {
          opacity: [0, 1],
          y: [16, 0],
          delay: (_, i) => 140 + i * 80,
          duration: 700,
          easing: "outExpo",
        }),
      );
    }

    const visibleCards = cardRefs.current.filter(Boolean);
    if (visibleCards.length > 0) {
      animations.push(
        animate(visibleCards, {
          opacity: [0, 1],
          y: [18, 0],
          scale: [0.97, 1],
          delay: (_, i) => 80 + i * 45,
          duration: 650,
          easing: "outCubic",
        }),
      );
    }

    const visibleInfo = infoRefs.current.filter(Boolean);
    if (visibleInfo.length > 0) {
      animations.push(
        animate(visibleInfo, {
          opacity: [0, 1],
          y: [16, 0],
          delay: (_, i) => 120 + i * 90,
          duration: 700,
          easing: "outExpo",
        }),
      );
    }

    return () => {
      animations.forEach((item) => item.pause());
    };
  }, [products.length]);

  const categoryOptions = useMemo(() => {
    const names = products
      .map((item) => item?.category?.name || item?.category || "")
      .filter(Boolean);

    return ["all", ...new Set(names)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = products.filter((item) => {
      const name = String(item?.name || "").toLowerCase();
      const categoryName = String(
        item?.category?.name || item?.category || "",
      ).toLowerCase();

      const searchMatch =
        !normalizedSearch ||
        name.includes(normalizedSearch) ||
        categoryName.includes(normalizedSearch);

      const categoryMatch =
        selectedCategory === "all" ||
        categoryName === selectedCategory.toLowerCase();

      return searchMatch && categoryMatch;
    });

    if (priceSort === "lowToHigh") {
      return [...filtered].sort(
        (a, b) => Number(a?.price || 0) - Number(b?.price || 0),
      );
    }

    if (priceSort === "highToLow") {
      return [...filtered].sort(
        (a, b) => Number(b?.price || 0) - Number(a?.price || 0),
      );
    }

    return [...filtered].sort(
      (a, b) => Number(b?.soldCount || 0) - Number(a?.soldCount || 0),
    );
  }, [products, searchTerm, selectedCategory, priceSort]);

  const stats = [
    {
      title: "Produk terpilih",
      value: `${products.length}+`,
      description: "Koleksi snack yang terus diperbarui",
    },
    {
      title: "Terlaris hari ini",
      value: `${products.filter((item) => Number(item?.soldCount || 0) > 0).length}+`,
      description: "Produk yang sudah dibeli pelanggan",
    },
    {
      title: "Belanja cepat",
      value: "1x klik",
      description: "Langsung masuk keranjang tanpa ribet",
    },
  ];

  const infoCards = [
    {
      title: "Kurasi produk terbaik",
      description:
        "Semua produk ditampilkan dengan foto, harga, stok, dan kategori supaya lebih mudah dipilih.",
      icon: "✨",
    },
    {
      title: "Responsive di semua perangkat",
      description:
        "Tampilan otomatis menyesuaikan layar desktop, tablet, dan ponsel dengan animasi yang halus.",
      icon: "📱",
    },
    {
      title: "Akses katalog lengkap",
      description:
        "Gunakan pencarian dan filter untuk menemukan snack favorit dengan lebih cepat dan praktis.",
      icon: "🛒",
    },
  ];

  const handleAddToCart = (product) => {
    const stock = Number(product?.stock || 0);

    if (Number.isFinite(stock) && stock < 1) {
      Swal.fire({
        icon: "warning",
        title: "Stok Habis",
        text: `${product.name} sedang kosong`,
        timer: 1400,
        showConfirmButton: false,
      });
      return;
    }

    addToCart(product);

    Swal.fire({
      icon: "success",
      title: "Berhasil",
      text: `${product.name} ditambahkan ke keranjang`,
      timer: 1200,
      showConfirmButton: false,
    });
  };

  const productCountText = filteredProducts.length
    ? `${filteredProducts.length} produk ditemukan`
    : "Tidak ada produk yang cocok";

  return (
    <div
      className={
        isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      }
    >
      <section
        ref={heroRef}
        className="relative overflow-hidden px-6 py-14 sm:py-18"
      >
        <div
          className={`absolute inset-0 ${
            isDark
              ? "bg-linear-to-br from-slate-900 via-slate-950 to-indigo-950"
              : "bg-linear-to-br from-orange-500 via-orange-400 to-amber-500"
          }`}
        />
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,white_0,transparent_36%),radial-gradient(circle_at_bottom_left,white_0,transparent_30%)]" />

        <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="text-white">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
              Katalog Produk Fayda Store
            </span>
            <h1 className="mt-5 max-w-2xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              Temukan snack favorit yang lagi ramai dibeli pelanggan.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/85 sm:text-base">
              Jelajahi seluruh katalog produk dengan pencarian cepat, filter
              kategori, dan urutan produk terbaik supaya belanja jadi lebih
              nyaman.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("produk-grid")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-orange-600 shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:bg-orange-50"
              >
                Lihat Produk
              </button>
              <button
                type="button"
                onClick={() => navigate("/home")}
                className="rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Kembali ke Home
              </button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {stats.map((item, index) => (
                <article
                  key={item.title}
                  ref={(el) => {
                    statRefs.current[index] = el;
                  }}
                  className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md shadow-lg shadow-black/10"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-white/70">
                    {item.title}
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">{item.value}</h2>
                  <p className="mt-1 text-sm text-white/80">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -left-6 -top-6 h-28 w-28 rounded-full bg-white/15 blur-2xl" />
            <div className="absolute -right-8 bottom-4 h-32 w-32 rounded-full bg-amber-200/20 blur-3xl" />
            <div
              className={`relative overflow-hidden rounded-4xl border p-5 shadow-2xl backdrop-blur-md sm:p-6 ${
                isDark
                  ? "border-slate-700 bg-slate-900/75"
                  : "border-white/40 bg-white/80"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}
                  >
                    Hot deals & best sellers
                  </p>
                  <p
                    className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
                  >
                    Update katalog setiap hari
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">
                  Ready to order
                </span>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {products.slice(0, 4).map((item, index) => {
                  const stock = Number(item?.stock || 0);
                  const isOutOfStock = Number.isFinite(stock) && stock < 1;

                  return (
                    <article
                      key={item.id}
                      className={`overflow-hidden rounded-2xl border shadow-lg transition duration-300 hover:-translate-y-1 ${
                        isDark
                          ? "border-slate-700 bg-slate-950/75"
                          : "border-slate-100 bg-white"
                      }`}
                    >
                      <div className="relative">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-36 w-full object-cover"
                        />
                        <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                          #{index + 1} Terlaris
                        </span>
                      </div>
                      <div className="p-4">
                        <h3
                          className={`font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}
                        >
                          {item.name}
                        </h3>
                        <p
                          className={`mt-1 text-sm font-bold ${isDark ? "text-indigo-300" : "text-orange-600"}`}
                        >
                          {formatRupiah(item.price)}
                        </p>

                        <p
                          className={`mt-1 text-xs ${isOutOfStock ? "text-red-500" : isDark ? "text-slate-400" : "text-slate-600"}`}
                        >
                          Stok: {Number.isFinite(stock) ? stock : "-"}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-4 md:grid-cols-3">
          {infoCards.map((item, index) => (
            <article
              key={item.title}
              ref={(el) => {
                infoRefs.current[index] = el;
              }}
              className={`rounded-3xl border p-5 shadow-sm transition hover:-translate-y-1 ${
                isDark
                  ? "border-slate-800 bg-slate-900"
                  : "border-orange-100 bg-white"
              }`}
            >
              <div className="text-2xl">{item.icon}</div>
              <h3
                className={`mt-3 text-lg font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}
              >
                {item.title}
              </h3>
              <p
                className={`mt-2 text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}
              >
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-14" id="produk-grid">
        <div
          className={`mb-6 rounded-3xl border p-4 shadow-sm sm:p-5 ${
            isDark
              ? "border-slate-800 bg-slate-900"
              : "border-orange-100 bg-white"
          }`}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Semua Produk</h2>
              <p
                className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}
              >
                {productCountText}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:w-[64%]">
              <input
                type="text"
                placeholder="Cari nama produk atau kategori..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-2 ${
                  isDark
                    ? "border-slate-700 bg-slate-950 text-slate-100 focus:ring-indigo-400"
                    : "border-orange-200 bg-white text-slate-700 focus:ring-orange-300"
                }`}
              />
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-2 ${
                  isDark
                    ? "border-slate-700 bg-slate-950 text-slate-100 focus:ring-indigo-400"
                    : "border-orange-200 bg-white text-slate-700 focus:ring-orange-300"
                }`}
              >
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category === "all" ? "Semua Kategori" : category}
                  </option>
                ))}
              </select>
              <select
                value={priceSort}
                onChange={(event) => setPriceSort(event.target.value)}
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-2 ${
                  isDark
                    ? "border-slate-700 bg-slate-950 text-slate-100 focus:ring-indigo-400"
                    : "border-orange-200 bg-white text-slate-700 focus:ring-orange-300"
                }`}
              >
                <option value="bestSeller">Terlaris</option>
                <option value="lowToHigh">Harga Terendah</option>
                <option value="highToLow">Harga Tertinggi</option>
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className={`h-72 animate-pulse rounded-3xl border ${
                  isDark
                    ? "border-slate-800 bg-slate-900"
                    : "border-orange-100 bg-white"
                }`}
              />
            ))}
          </div>
        ) : errorMessage ? (
          <div
            className={`rounded-3xl border p-5 ${isDark ? "border-red-900/40 bg-red-950/30 text-red-200" : "border-red-100 bg-red-50 text-red-600"}`}
          >
            {errorMessage}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div
            className={`rounded-3xl border p-5 ${isDark ? "border-slate-800 bg-slate-900 text-slate-300" : "border-orange-100 bg-white text-slate-600"}`}
          >
            Produk tidak ditemukan.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {filteredProducts.map((item, index) => {
              const stock = Number(item?.stock || 0);
              const isOutOfStock = Number.isFinite(stock) && stock < 1;
              const soldCount = Number(item?.soldCount || 0);

              return (
                <article
                  key={item.id}
                  ref={(el) => {
                    cardRefs.current[index] = el;
                  }}
                  className={`group overflow-hidden rounded-3xl border shadow-lg transition duration-300 hover:-translate-y-2 ${
                    isDark
                      ? "border-slate-800 bg-slate-900 hover:shadow-[0_20px_50px_rgba(79,70,229,0.2)]"
                      : "border-orange-100 bg-white hover:shadow-[0_20px_50px_rgba(249,115,22,0.18)]"
                  }`}
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-52 w-full object-cover transition duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/10 to-transparent" />
                    <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-900 backdrop-blur-sm">
                        {item?.category?.name || item?.category || "Umum"}
                      </span>
                      <span className="rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-white">
                        {soldCount > 0 ? `${soldCount} terjual` : "Baru"}
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <h3
                      className={`text-lg font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}
                    >
                      {item.name}
                    </h3>
                    {/* <p
                      className={`mt-2 line-clamp-3 text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}
                    >
                      {item.description}
                    </p> */}

                    <div className="mt-4 flex items-end justify-between gap-3">
                      <div>
                        <p
                          className={`text-xs uppercase tracking-[0.2em] ${isDark ? "text-slate-400" : "text-slate-500"}`}
                        >
                          Harga
                        </p>
                        <p
                          className={`mt-1 text-xl font-black ${isDark ? "text-indigo-300" : "text-orange-600"}`}
                        >
                          {formatRupiah(item.price)}
                        </p>
                      </div>
                      <div
                        className={`rounded-2xl px-3 py-2 text-right text-xs ${isDark ? "bg-slate-950 text-slate-300" : "bg-orange-50 text-slate-600"}`}
                      >
                        <p>Stok</p>
                        <p className="text-sm font-bold">
                          {Number.isFinite(stock) ? stock : "-"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/produk/${item.id}`)}
                        className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold text-white transition duration-300 ${
                          isDark
                            ? "bg-slate-700 hover:bg-slate-600"
                            : "bg-slate-500 hover:bg-slate-600"
                        }`}
                      >
                        Lihat Detail
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddToCart(item)}
                        disabled={isOutOfStock}
                        className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold text-white transition duration-300 ${
                          isOutOfStock
                            ? "cursor-not-allowed bg-slate-400"
                            : isDark
                              ? "bg-indigo-600 hover:bg-indigo-700"
                              : "bg-orange-500 hover:bg-orange-600"
                        }`}
                      >
                        {isOutOfStock ? "Stok Habis" : "Tambah Pesanan"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
