import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { animate } from "animejs";
import api from "../api/axios";
import { useSettings } from "../context/SettingsContext";
import { addToCart } from "../utils/cartStorage";
import Swal from "sweetalert2";

const formatRupiah = (value) =>
  `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

const PREVIEW_RATINGS_COUNT = 4;

function ratingRowKey(rating, index) {
  return rating?.id != null ? `rating-${rating.id}` : `rating-i-${index}`;
}

export default function DetailProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useSettings();
  const isDark = theme === "dark";

  const [product, setProduct] = useState(null);
  const [ratings, setRatings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [modalStarFilter, setModalStarFilter] = useState(null);
  const [modalSort, setModalSort] = useState("high");

  const headerRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    window.scrollTo(0, 0);
    fetchProductDetails();
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const [productRes, ratingsRes] = await Promise.all([
        api.get(`/pub/products/${id}`),
        api.get(`/pub/ratings/product/${id}`),
      ]);

      setProduct(productRes.data);
      setRatings(ratingsRes.data || {});
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message || "Gagal memuat detail produk",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const animations = [];

    if (headerRef.current) {
      animations.push(
        animate(headerRef.current, {
          opacity: [0, 1],
          y: [20, 0],
          duration: 700,
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
          duration: 700,
          easing: "outExpo",
        }),
      );
    }

    return () => animations.forEach((a) => a.pause());
  }, [product]);

  const ratingsListForMemo = ratings?.ratings || [];

  const modalFilteredRatings = useMemo(() => {
    let list = [...ratingsListForMemo];
    if (modalStarFilter !== null) {
      list = list.filter((r) => Number(r.rating) === modalStarFilter);
    }
    list.sort((a, b) => {
      const ra = Number(a.rating);
      const rb = Number(b.rating);
      if (ra !== rb) {
        return modalSort === "high" ? rb - ra : ra - rb;
      }
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      return modalSort === "high" ? tb - ta : ta - tb;
    });
    return list;
  }, [ratingsListForMemo, modalStarFilter, modalSort]);

  useEffect(() => {
    if (!ratingModalOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setRatingModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ratingModalOpen]);

  const handleAddToCart = () => {
    if (!product) return;

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

  if (isLoading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          isDark ? "bg-slate-950" : "bg-slate-50"
        }`}
      >
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-orange-500 mb-3"></div>
          <p
            className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}
          >
            Memuat produk...
          </p>
        </div>
      </div>
    );
  }

  if (errorMessage || !product) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center p-4 ${
          isDark ? "bg-slate-950" : "bg-slate-50"
        }`}
      >
        <div className="text-center">
          <div className="text-5xl mb-4">❌</div>
          <p
            className={`text-lg font-semibold ${
              isDark ? "text-slate-100" : "text-slate-900"
            }`}
          >
            {errorMessage || "Produk tidak ditemukan"}
          </p>
          <button
            onClick={() => navigate("/produk")}
            className="mt-4 rounded-lg bg-orange-500 hover:bg-orange-600 px-6 py-2 text-sm font-semibold text-white transition"
          >
            Kembali ke Katalog
          </button>
        </div>
      </div>
    );
  }

  const avgRating = ratings?.averageRating || 0;
  const totalRatings = ratings?.totalRatings || 0;
  const ratingsList = ratings?.ratings || [];
  const stock = Number(product?.stock || 0);
  const isOutOfStock = !Number.isFinite(stock) || stock < 1;

  const previewRatings = ratingsList.slice(0, PREVIEW_RATINGS_COUNT);
  const hasMoreRatings = ratingsList.length > PREVIEW_RATINGS_COUNT;

  const openRatingsModal = () => {
    setModalStarFilter(null);
    setModalSort("high");
    setRatingModalOpen(true);
  };

  const renderReviewCard = (rating, index) => (
    <div
      key={ratingRowKey(rating, index)}
      className={`rounded-xl p-4 ${
        isDark ? "bg-slate-800" : "bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`font-semibold ${
              isDark ? "text-slate-100" : "text-slate-900"
            }`}
          >
            {rating.user?.name || "User Anonim"}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-lg">{"⭐".repeat(Number(rating.rating) || 0)}</span>
            <span
              className={`text-xs ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {rating.rating} dari 5
            </span>
          </div>
        </div>
        <p
          className={`shrink-0 text-xs ${
            isDark ? "text-slate-400" : "text-slate-500"
          }`}
        >
          {new Date(rating.createdAt).toLocaleDateString("id-ID", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>

      {rating.review ? (
        <p
          className={`mt-3 leading-relaxed ${
            isDark ? "text-slate-300" : "text-slate-600"
          }`}
        >
          {rating.review}
        </p>
      ) : null}
    </div>
  );

  const starFilterBtnClass = (stars, active) =>
    `rounded-full px-3 py-2 text-sm font-semibold transition ${
      active
        ? isDark
          ? "bg-indigo-500 text-white shadow"
          : "bg-orange-500 text-white shadow"
        : isDark
          ? "border border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
          : "border border-orange-100 bg-white text-slate-700 hover:bg-orange-50"
    }`;

  const sortBtnClass = (value, active) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition ${
      active
        ? isDark
          ? "bg-slate-700 text-white ring-1 ring-slate-500"
          : "bg-orange-100 text-orange-700 ring-1 ring-orange-200"
        : isDark
          ? "text-slate-400 hover:bg-slate-800"
          : "text-slate-600 hover:bg-slate-50"
    }`;

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark
          ? "bg-linear-to-br from-slate-950 via-slate-900 to-slate-950"
          : "bg-linear-to-br from-orange-50 via-white to-amber-50"
      }`}
    >
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        {/* BACK BUTTON */}
        <button
          onClick={() => navigate("/produk")}
          className={`mb-6 flex text-white items-center gap-2 rounded-lg px-4 py-2 transition ${
            isDark
              ? "bg-indigo-600 hover:bg-indigo-700"
              : "bg-orange-500 hover:bg-orange-600"
          }`}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Kembali ke Katalog
        </button>

        <div
          ref={headerRef}
          className={`mb-8 grid grid-cols-1 gap-8 rounded-3xl p-6 md:p-8 ${
            isDark
              ? "bg-slate-900 border border-slate-700"
              : "bg-white border border-orange-100 shadow-sm"
          } md:grid-cols-2`}
        >
          {/* PRODUCT IMAGE */}
          <div>
            <img
              src={product?.image}
              alt={product?.name}
              className="h-full w-full rounded-2xl object-cover"
            />
          </div>

          {/* PRODUCT INFO */}
          <div className="flex flex-col justify-between">
            <div>
              <p
                className={`text-xs uppercase tracking-widest ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                {product?.category?.name || "Kategori"}
              </p>

              <h1
                className={`mt-2 text-3xl font-bold md:text-4xl ${
                  isDark ? "text-slate-100" : "text-slate-900"
                }`}
              >
                {product?.name}
              </h1>

              {/* RATING SUMMARY */}
              <div className="mt-4 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⭐</span>
                  <span
                    className={`text-xl font-bold ${
                      isDark ? "text-slate-200" : "text-slate-800"
                    }`}
                  >
                    {Number(avgRating).toFixed(1)}
                  </span>
                </div>
                <p
                  className={`text-sm ${
                    isDark ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  {totalRatings} rating
                </p>
              </div>

              {/* PRICE & STOCK */}
              <div className="mt-6 space-y-3">
                <div>
                  <p
                    className={`text-xs uppercase tracking-widest ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    Harga
                  </p>
                  <p
                    className={`text-3xl font-black ${
                      isDark ? "text-indigo-300" : "text-orange-600"
                    }`}
                  >
                    {formatRupiah(product?.price)}
                  </p>
                </div>

                <div>
                  <p
                    className={`text-xs uppercase tracking-widest ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    Stok
                  </p>
                  <p
                    className={`mt-1 text-lg font-bold ${
                      isOutOfStock
                        ? "text-red-500"
                        : isDark
                          ? "text-emerald-400"
                          : "text-emerald-600"
                    }`}
                  >
                    {isOutOfStock ? "Stok Habis" : `${stock} Tersedia`}
                  </p>
                </div>
              </div>
            </div>

            {/* ADD TO CART BUTTON */}
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`mt-8 w-full rounded-2xl px-6 py-4 text-lg font-bold text-white transition duration-300 ${
                isOutOfStock
                  ? "cursor-not-allowed bg-slate-400"
                  : isDark
                    ? "bg-indigo-600 hover:bg-indigo-700"
                    : "bg-orange-500 hover:bg-orange-600"
              }`}
            >
              {isOutOfStock ? "Stok Habis" : "+ Tambah Keranjang"}
            </button>
          </div>
        </div>

        {/* DESCRIPTION */}
        <div
          ref={contentRef}
          className={`mb-8 rounded-3xl p-6 md:p-8 ${
            isDark
              ? "bg-slate-900 border border-slate-700"
              : "bg-white border border-orange-100 shadow-sm"
          }`}
        >
          <h2
            className={`text-2xl font-bold mb-4 ${
              isDark ? "text-slate-100" : "text-slate-900"
            }`}
          >
            Deskripsi Produk
          </h2>
          <p
            className={`leading-relaxed ${
              isDark ? "text-slate-300" : "text-slate-600"
            }`}
          >
            {product?.description}
          </p>
        </div>

        {/* RATINGS & REVIEWS */}
        <div
          className={`rounded-3xl p-6 md:p-8 ${
            isDark
              ? "bg-slate-900 border border-slate-700"
              : "bg-white border border-orange-100 shadow-sm"
          }`}
        >
          <h2
            className={`text-2xl font-bold mb-6 ${
              isDark ? "text-slate-100" : "text-slate-900"
            }`}
          >
            Ulasan Pembeli ({totalRatings})
          </h2>

          {ratingsList.length === 0 ? (
            <p
              className={`text-center py-8 ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Belum ada ulasan. Jadilah yang pertama memberikan ulasan!
            </p>
          ) : (
            <>
              <div className="space-y-4">
                {previewRatings.map((rating, index) =>
                  renderReviewCard(rating, index),
                )}
              </div>
              {hasMoreRatings ? (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={openRatingsModal}
                    className={`rounded-full px-6 py-2.5 text-sm font-semibold transition ${
                      isDark
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "bg-orange-500 text-white hover:bg-orange-600"
                    }`}
                  >
                    Selengkapnya ({ratingsList.length} ulasan)
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      {ratingModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ratings-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRatingModalOpen(false);
          }}
        >
          <div
            className={`flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl shadow-xl ${
              isDark
                ? "border border-slate-700 bg-slate-900"
                : "border border-orange-100 bg-white"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`flex shrink-0 items-center justify-between gap-3 border-b px-4 py-4 sm:px-6 ${
                isDark ? "border-slate-700" : "border-orange-100"
              }`}
            >
              <h3
                id="ratings-modal-title"
                className={`text-lg font-bold ${
                  isDark ? "text-slate-100" : "text-slate-900"
                }`}
              >
                Semua ulasan ({modalFilteredRatings.length})
              </h3>
              <button
                type="button"
                onClick={() => setRatingModalOpen(false)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  isDark
                    ? "text-slate-300 hover:bg-slate-800"
                    : "text-slate-600 hover:bg-orange-50"
                }`}
              >
                Tutup
              </button>
            </div>

            <div className="shrink-0 space-y-4 border-b px-4 py-4 sm:px-6 sm:py-5">
              <div>
                <p
                  className={`mb-2 text-xs font-medium uppercase tracking-wide ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Filter bintang
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setModalStarFilter(null)}
                    className={starFilterBtnClass(null, modalStarFilter === null)}
                  >
                    Semua
                  </button>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setModalStarFilter(n)}
                      className={starFilterBtnClass(n, modalStarFilter === n)}
                      aria-pressed={modalStarFilter === n}
                    >
                      {"⭐".repeat(n)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p
                  className={`mb-2 text-xs font-medium uppercase tracking-wide ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Urutkan
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setModalSort("high")}
                    className={sortBtnClass("high", modalSort === "high")}
                  >
                    Rating tertinggi
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalSort("low")}
                    className={sortBtnClass("low", modalSort === "low")}
                  >
                    Rating terendah
                  </button>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
              {modalFilteredRatings.length === 0 ? (
                <p
                  className={`py-8 text-center text-sm ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Tidak ada ulasan untuk filter ini.
                </p>
              ) : (
                <div className="space-y-4">
                  {modalFilteredRatings.map((rating, index) =>
                    renderReviewCard(rating, index),
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
