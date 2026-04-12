import { animate } from "animejs";
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/axios";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { addToCart } from "../utils/cartStorage";
import { useSettings } from "../context/SettingsContext";
import socket from "../utils/socket";

export default function Home() {
  const navigate = useNavigate();
  const { theme } = useSettings();
  const isDark = theme === "dark";

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [productRatings, setProductRatings] = useState({});

  // AI STATE
  const [aiImage, setAiImage] = useState(null);
  const [aiPreview, setAiPreview] = useState(null);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isAiChatClosing, setIsAiChatClosing] = useState(false);
  const [aiChats, setAiChats] = useState([
    {
      id: Date.now(),
      role: "assistant",
      text: "Halo! Kirim foto snack, nanti aku carikan produk paling mirip ya 👋",
      products: [],
      image: null,
    },
  ]);

  const heroRef = useRef(null);
  const heroItemsRef = useRef([]);
  const productTitleRef = useRef(null);
  const productCardsRef = useRef([]);
  const promoRef = useRef(null);
  const contentSectionRef = useRef(null);
  const contentCardRefs = useRef([]);
  const infoCardRefs = useRef([]);
  const aiFileInputRef = useRef(null);
  const aiChatPanelRef = useRef(null);
  const aiChatFabRef = useRef(null);

  const whatsappNumber = "6285740529930";

  const openWhatsApp = (message) => {
    const encodedMessage = encodeURIComponent(message || "Halo Fayda Store");
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const handleSubmitContact = (event) => {
    event.preventDefault();

    const trimmedName = contactName.trim();
    const trimmedMessage = contactMessage.trim();

    if (!trimmedName || !trimmedMessage) {
      Swal.fire({
        icon: "warning",
        title: "Form belum lengkap",
        text: "Nama dan pesan wajib diisi",
        timer: 1500,
        showConfirmButton: false,
      });
      return;
    }

    const message = `Halo Fayda Store, saya ${trimmedName}.\n\n${trimmedMessage}`;
    openWhatsApp(message);
  };

  const openAiChat = () => {
    setIsAiChatOpen(true);
  };

  const closeAiChat = () => {
    if (!aiChatPanelRef.current) {
      setIsAiChatOpen(false);
      return;
    }

    setIsAiChatClosing(true);

    const orderedSections = Array.from(
      aiChatPanelRef.current.querySelectorAll("[data-chat-section]"),
    );

    if (orderedSections.length) {
      animate(orderedSections, {
        opacity: [1, 0],
        y: [0, 10],
        delay: (_, i) => i * 70,
        duration: 220,
        easing: "inQuad",
      });
    }

    animate(aiChatPanelRef.current, {
      opacity: [1, 0],
      y: [0, 24],
      scale: [1, 0.96],
      duration: 420,
      easing: "inExpo",
    });

    setTimeout(() => {
      setIsAiChatOpen(false);
      setIsAiChatClosing(false);
    }, 430);
  };

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

  // ========================
  // ADD TO CART
  // ========================
  const handleAddToCart = (product) => {
    const stock = Number(product?.stock || 0);
    if (Number.isFinite(stock) && stock < 1) {
      Swal.fire({
        icon: "warning",
        title: "Stok Habis",
        text: `${product.name} sedang kosong dan tidak bisa ditambahkan`,
        timer: 1500,
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

  // ========================
  // AI IMAGE HANDLER
  // ========================
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAiError("");
    setAiImage(file);
    setAiPreview(URL.createObjectURL(file));
  };

  const handleSendAIMessage = async () => {
    const textQuery = aiText.trim();

    if (!aiImage && !textQuery) {
      setAiError("Tulis pesan atau pilih gambar dulu");
      return;
    }

    const userMessage = {
      id: Date.now(),
      role: "user",
      text: textQuery || "Tolong carikan produk yang mirip dengan foto ini.",
      image: aiImage ? aiPreview : null,
      products: [],
    };

    const processingMessage = {
      id: Date.now() + 1,
      role: "assistant",
      text: "Sedang menganalisis foto...",
      image: null,
      products: [],
      loading: true,
    };

    setAiError("");
    setAiChats((prev) => [...prev, userMessage, processingMessage]);

    try {
      setAiLoading(true);

      let data;
      if (aiImage) {
        const formData = new FormData();
        formData.append("image", aiImage);
        const response = await api.post("/ai/image-search", formData);
        data = response.data;
      } else {
        const response = await api.post("/ai/text-search", {
          query: textQuery,
        });
        data = response.data;
      }

      const foundProducts = data.products || [];

      setAiChats((prev) =>
        prev.map((msg) =>
          msg.id === processingMessage.id
            ? {
                ...msg,
                loading: false,
                text:
                  data.ai_result ||
                  (foundProducts.length
                    ? "Ini hasil produk yang paling mirip dengan fotomu."
                    : "Maaf, aku belum menemukan produk yang cocok."),
                products: foundProducts,
              }
            : msg,
        ),
      );

      setAiImage(null);
      setAiPreview(null);
      setAiText("");
    } catch (error) {
      setAiChats((prev) =>
        prev.map((msg) =>
          msg.id === processingMessage.id
            ? {
                ...msg,
                loading: false,
                text: "Maaf, AI sedang gangguan. Coba lagi sebentar ya.",
              }
            : msg,
        ),
      );
      setAiError("Gagal proses AI");
    } finally {
      setAiLoading(false);
    }
  };

  // ========================
  // FETCH PRODUCTS
  // ========================
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

  // ========================
  // ANIMATION
  // ========================
  useEffect(() => {
    const animations = [];

    if (heroRef.current) {
      animations.push(
        animate(heroRef.current, {
          opacity: [0, 1],
          y: [24, 0],
          duration: 1200,
          easing: "outExpo",
        }),
      );
    }

    if (heroItemsRef.current.length > 0) {
      animations.push(
        animate(heroItemsRef.current, {
          opacity: [0, 1],
          y: [20, 0],
          delay: (_, i) => 200 + i * 150,
          duration: 900,
          easing: "outExpo",
        }),
      );
    }

    if (productCardsRef.current.length > 0) {
      animations.push(
        animate(productCardsRef.current.filter(Boolean), {
          opacity: [0, 1],
          y: [10, 0],
          scale: [0.98, 1],
          delay: (_, i) => 120 + Math.min(i, 6) * 55,
          duration: 520,
          easing: "outCubic",
        }),
      );
    }

    if (contentCardRefs.current.length > 0) {
      animations.push(
        animate(contentCardRefs.current.filter(Boolean), {
          opacity: [0, 1],
          y: [18, 0],
          delay: (_, i) => 250 + i * 110,
          duration: 850,
          easing: "outExpo",
        }),
      );
    }

    if (infoCardRefs.current.length > 0) {
      animations.push(
        animate(infoCardRefs.current.filter(Boolean), {
          opacity: [0, 1],
          y: [16, 0],
          delay: (_, i) => 150 + i * 90,
          duration: 780,
          easing: "outExpo",
        }),
      );
    }

    if (contentSectionRef.current) {
      animations.push(
        animate(contentSectionRef.current, {
          opacity: [0, 1],
          y: [20, 0],
          delay: 180,
          duration: 900,
          easing: "outExpo",
        }),
      );
    }

    return () => {
      animations.forEach((a) => a.pause());
    };
  }, [products.length]);

  const featuredProducts = useMemo(() => products.slice(0, 4), [products]);

  const appSteps = [
    {
      title: "Pilih Produk Favorit",
      description:
        "Jelajahi katalog snack terlaris, gunakan pencarian, filter kategori, lalu tambah ke keranjang.",
      icon: "🛍️",
    },
    {
      title: "Lengkapi Pengiriman",
      description:
        "Isi data penerima dan ambil lokasi otomatis agar ongkir terhitung akurat berdasarkan jarak.",
      icon: "📍",
    },
    {
      title: "Bayar dengan Mudah",
      description:
        "Pilih pembayaran Tunai atau Pembayaran Online, kemudian pantau statusnya di riwayat pesanan.",
      icon: "💳",
    },
  ];

  const advantages = [
    {
      title: "Rekomendasi AI Cepat",
      description:
        "Upload foto atau ketik kebutuhanmu, AI bantu cari produk paling mirip.",
    },
    {
      title: "Checkout Praktis",
      description:
        "Alur checkout singkat, ringkas, dan tetap informatif dari keranjang sampai bayar.",
    },
    {
      title: "Tema Nyaman",
      description:
        "Tampilan tetap rapi di light/dark mode untuk penggunaan siang maupun malam.",
    },
  ];

  useEffect(() => {
    if (isAiChatOpen && !isAiChatClosing && aiChatPanelRef.current) {
      const orderedSections = Array.from(
        aiChatPanelRef.current.querySelectorAll("[data-chat-section]"),
      );

      animate(aiChatPanelRef.current, {
        opacity: [0, 1],
        y: [24, 0],
        scale: [0.95, 1],
        duration: 520,
        easing: "outExpo",
      });

      if (orderedSections.length) {
        animate(orderedSections, {
          opacity: [0, 1],
          y: [12, 0],
          delay: (_, i) => 220 + i * 140,
          duration: 420,
          easing: "outExpo",
        });
      }
    }

    if (!isAiChatOpen && aiChatFabRef.current) {
      animate(aiChatFabRef.current, {
        scale: [0.88, 1],
        opacity: [0.4, 1],
        duration: 260,
        easing: "outBack",
      });
    }
  }, [isAiChatOpen]);

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark ? "bg-slate-950" : "bg-gray-50"
      }`}
    >
      {/* HERO */}
      <section
        ref={heroRef}
        className={`relative overflow-hidden px-6 py-16 text-white ${
          isDark
            ? "bg-linear-to-r from-slate-900 via-slate-900 to-indigo-950"
            : "bg-linear-to-r from-orange-500 via-orange-400 to-amber-500"
        }`}
      >
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,white_0,transparent_32%),radial-gradient(circle_at_bottom_left,white_0,transparent_28%)]" />

        <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="text-center lg:text-left">
            <span
              ref={(el) => (heroItemsRef.current[0] = el)}
              className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em]"
            >
              Fayda Store Snack Market
            </span>

            <h1
              ref={(el) => (heroItemsRef.current[1] = el)}
              className="mt-5 text-3xl font-black leading-tight sm:text-5xl"
            >
              Snack enak, harga bersahabat, dan selalu ada produk terlaris.
            </h1>

            <p
              ref={(el) => (heroItemsRef.current[2] = el)}
              className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/85 lg:mx-0 sm:text-base"
            >
              Jelajahi 4 produk paling laris langsung di beranda, lalu buka
              katalog lengkap untuk melihat semua snack favoritmu.
            </p>

            <div
              ref={(el) => (heroItemsRef.current[3] = el)}
              className="mt-7 flex flex-wrap justify-center gap-3 lg:justify-start"
            >
              <button
                type="button"
                onClick={() => navigate("/produk")}
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-orange-600 shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:bg-orange-50"
              >
                Lihat Semua Produk
              </button>
              <button
                type="button"
                onClick={() =>
                  openWhatsApp(
                    "Halo Fayda Store, saya ingin tanya produk terlaris.",
                  )
                }
                className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Tanya Admin
              </button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                {
                  label: "Produk populer",
                  value: `${featuredProducts.length}+`,
                },
                { label: "Pesanan cepat", value: "24/7" },
                { label: "Tampilan responsif", value: "100%" },
              ].map((item, index) => (
                <article
                  key={item.label}
                  ref={(el) => (heroItemsRef.current[index + 4] = el)}
                  className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md shadow-lg shadow-black/10"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-white/70">
                    {item.label}
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">{item.value}</h2>
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
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p
                    className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}
                  >
                    Banner Produk Favorit
                  </p>
                  <p
                    className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
                  >
                    Rekomendasi pilihan pelanggan
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">
                  Best Seller
                </span>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {featuredProducts.map((item, index) => {
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
                          Rp {Number(item.price).toLocaleString("id-ID")}
                        </p>
                        {productRatings[item.id] && (
                          <div className="mt-1 flex items-center gap-1">
                            <span className="text-sm">⭐</span>
                            <span
                              className={`text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}
                            >
                              {productRatings[item.id].averageRating || 0}
                            </span>
                            <span
                              className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
                            >
                              ({productRatings[item.id].totalRatings || 0})
                            </span>
                          </div>
                        )}
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

      <button
        type="button"
        onClick={() =>
          openWhatsApp("Halo Fayda Store, saya ingin bertanya produk.")
        }
        className="fixed bottom-20 right-4 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl transition hover:bg-emerald-600 sm:bottom-24 sm:right-6"
        aria-label="Hubungi WhatsApp"
        title="WhatsApp"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
          <path d="M20.52 3.48A11.86 11.86 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.15 1.58 5.96L0 24l6.31-1.65a11.86 11.86 0 0 0 5.74 1.46h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.43-8.44Zm-8.47 18.3h-.01a9.94 9.94 0 0 1-5.07-1.39l-.36-.21-3.74.98 1-3.65-.23-.37a9.92 9.92 0 0 1-1.53-5.26c0-5.49 4.47-9.96 9.97-9.96 2.66 0 5.16 1.04 7.04 2.92a9.9 9.9 0 0 1 2.91 7.05c0 5.49-4.47 9.96-9.98 9.96Zm5.46-7.43c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.69.15-.2.3-.79.98-.97 1.18-.18.2-.36.23-.66.08-.3-.15-1.28-.47-2.44-1.5-.9-.8-1.5-1.79-1.68-2.09-.18-.3-.02-.46.13-.61.14-.14.3-.36.46-.54.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.54-.08-.15-.69-1.66-.95-2.28-.25-.6-.5-.52-.69-.53l-.59-.01c-.2 0-.53.08-.8.38s-1.05 1.03-1.05 2.52 1.08 2.94 1.23 3.14c.15.2 2.12 3.24 5.14 4.54.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.78-.73 2.03-1.44.25-.71.25-1.32.18-1.44-.08-.11-.28-.18-.58-.33Z" />
        </svg>
      </button>

      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
        {isAiChatOpen || isAiChatClosing ? (
          <div
            ref={aiChatPanelRef}
            className={`w-[92vw] sm:w-90 max-w-105 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
              isDark ? "bg-slate-900" : "bg-white"
            }`}
          >
            <div
              data-chat-section
              className={`flex items-center justify-between px-4 py-3 text-white ${
                isDark ? "bg-slate-800" : "bg-orange-500"
              }`}
            >
              <h2 className="font-semibold">AI Chat Produk</h2>
              <button
                onClick={closeAiChat}
                className="text-lg leading-none bg-white/20 px-2 py-1 rounded transition hover:bg-white/30"
                aria-label="Tutup AI Chat"
              >
                ×
              </button>
            </div>

            <div
              data-chat-section
              className={`h-[52vh] sm:h-80 overflow-y-auto p-4 space-y-3 ${
                isDark ? "bg-slate-950" : "bg-gray-50"
              }`}
            >
              {aiChats.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? isDark
                          ? "bg-indigo-600 text-white"
                          : "bg-orange-500 text-white"
                        : isDark
                          ? "bg-slate-800 text-slate-100 shadow-md"
                          : "bg-white text-gray-800 shadow-md"
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>

                    {msg.image && (
                      <img
                        src={msg.image}
                        alt="Foto produk user"
                        className="mt-2 w-24 h-24 object-cover rounded"
                      />
                    )}

                    {!msg.loading && msg.products?.length > 0 && (
                      <div className="grid grid-cols-1 gap-3 mt-3">
                        {msg.products.map((item) =>
                          (() => {
                            const stock = Number(item?.stock || 0);
                            const isOutOfStock =
                              Number.isFinite(stock) && stock < 1;

                            return (
                              <div
                                key={item.id}
                                className={`rounded-lg p-2 shadow-md ${
                                  isDark ? "bg-slate-700" : "bg-white"
                                }`}
                              >
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="h-24 w-full object-cover rounded"
                                />
                                <h4
                                  className={`text-sm font-semibold mt-2 ${
                                    isDark ? "text-slate-100" : "text-gray-800"
                                  }`}
                                >
                                  {item.name}
                                </h4>
                                <p
                                  className={`font-bold text-sm ${
                                    isDark
                                      ? "text-indigo-300"
                                      : "text-orange-500"
                                  }`}
                                >
                                  Rp{" "}
                                  {Number(item.price).toLocaleString("id-ID")}
                                </p>
                                <p
                                  className={`mt-1 text-xs ${
                                    isOutOfStock
                                      ? "text-red-500"
                                      : isDark
                                        ? "text-slate-300"
                                        : "text-slate-600"
                                  }`}
                                >
                                  Stok: {Number.isFinite(stock) ? stock : "-"}
                                </p>
                                <button
                                  onClick={() => handleAddToCart(item)}
                                  disabled={isOutOfStock}
                                  className={`mt-2 w-full py-1 rounded text-sm transition ${
                                    isOutOfStock
                                      ? "bg-slate-400 text-white cursor-not-allowed"
                                      : isDark
                                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                        : "bg-orange-500 text-white hover:bg-orange-600"
                                  }`}
                                >
                                  {isOutOfStock ? "Stok Habis" : "Tambah Pesanan"}
                                </button>
                              </div>
                            );
                          })(),
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div
              data-chat-section
              className={`p-4 space-y-3 shadow-[0_-8px_20px_rgba(0,0,0,0.06)] ${
                isDark ? "bg-slate-900" : "bg-white"
              }`}
            >
              <input
                ref={aiFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => aiFileInputRef.current?.click()}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded font-medium shadow-sm transition ${
                  isDark
                    ? "text-indigo-200 bg-slate-800 hover:bg-slate-700"
                    : "text-orange-600 bg-orange-50 hover:bg-orange-100"
                }`}
              >
                <span aria-hidden="true">📷</span>
                Pilih Foto Produk
              </button>

              {aiPreview && (
                <div className="flex items-center gap-3">
                  <img
                    src={aiPreview}
                    alt="Preview upload"
                    className="w-20 h-20 object-cover rounded shadow-sm"
                  />
                  <p
                    className={`text-xs ${isDark ? "text-slate-300" : "text-gray-600"}`}
                  >
                    Foto siap dikirim ke AI
                  </p>
                </div>
              )}

              {aiError && <p className="text-sm text-red-500">{aiError}</p>}

              <button
                onClick={handleSendAIMessage}
                className={`w-full px-6 py-2 rounded shadow-md transition disabled:opacity-70 disabled:cursor-not-allowed ${
                  isDark
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-orange-500 text-white hover:bg-orange-600"
                }`}
                disabled={aiLoading}
              >
                {aiLoading ? "Mencari..." : "Kirim ke AI"}
              </button>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSendAIMessage();
                    }
                  }}
                  placeholder="Contoh: tolong cari produk kripik singkong"
                  className={`flex-1 rounded px-3 py-2 text-sm outline-none focus:ring-2 ${
                    isDark
                      ? "bg-slate-800 text-slate-100 focus:ring-indigo-400"
                      : "bg-orange-50 text-slate-700 focus:ring-orange-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={handleSendAIMessage}
                  disabled={aiLoading}
                  className={`rounded px-3 py-2 text-sm font-medium text-white transition disabled:opacity-70 ${
                    isDark
                      ? "bg-indigo-600 hover:bg-indigo-700"
                      : "bg-orange-500 hover:bg-orange-600"
                  }`}
                >
                  Kirim
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            ref={aiChatFabRef}
            onClick={openAiChat}
            className={`px-4 py-2.5 sm:px-5 sm:py-3 text-white rounded-xl shadow-xl font-semibold transition-all duration-300 hover:scale-[1.02] ${
              isDark
                ? "bg-indigo-600 hover:bg-indigo-700"
                : "bg-orange-500 hover:bg-orange-600"
            }`}
            aria-label="Buka AI Chat"
          >
            AI Chat
          </button>
        )}
      </div>

      {/* PRODUCTS */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2
              className={`text-2xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}
            >
              4 Produk Terlaris 🔥
            </h2>
            <p
              className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}
            >
              Ringkas, cepat, dan fokus ke produk yang paling diminati
              pelanggan.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/produk")}
            className={`hidden rounded-full px-4 py-2 text-sm font-semibold transition md:inline-flex ${
              isDark
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-orange-500 text-white hover:bg-orange-600"
            }`}
          >
            Lihat Katalog Lengkap
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {isLoading ? (
            <p>Loading...</p>
          ) : errorMessage ? (
            <p className="text-sm text-red-500">{errorMessage}</p>
          ) : featuredProducts.length === 0 ? (
            <p className={isDark ? "text-slate-300" : "text-slate-600"}>
              Produk tidak ditemukan.
            </p>
          ) : (
            featuredProducts.map((item, i) =>
              (() => {
                const stock = Number(item?.stock || 0);
                const isOutOfStock = Number.isFinite(stock) && stock < 1;

                return (
                  <div
                    key={item.id}
                    ref={(el) => (productCardsRef.current[i] = el)}
                    className={`group relative overflow-hidden rounded-3xl p-3 shadow-md transition-all duration-500 hover:-translate-y-2 ${
                      isDark
                        ? "bg-slate-900 hover:shadow-[0_20px_40px_rgba(99,102,241,0.22)]"
                        : "bg-white hover:shadow-[0_20px_40px_rgba(249,115,22,0.28)]"
                    }`}
                  >
                    <div
                      className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 ${
                        isDark
                          ? "bg-linear-to-br from-slate-700/0 via-slate-700/0 to-indigo-500/20"
                          : "bg-linear-to-br from-orange-100/0 via-orange-100/0 to-orange-200/40"
                      }`}
                    />

                    <div className="overflow-hidden rounded-xl">
                      <img
                        src={item.image}
                        className="h-40 w-full object-cover rounded-xl transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>

                    <h3
                      className={`text-sm font-semibold mt-3 transition-colors duration-300 ${
                        isDark
                          ? "text-slate-100 group-hover:text-indigo-300"
                          : "text-slate-800 group-hover:text-orange-600"
                      }`}
                    >
                      {item.name}
                    </h3>

                    <p
                      className={`font-bold ${isDark ? "text-indigo-300" : "text-orange-500"}`}
                    >
                      Rp {Number(item.price).toLocaleString("id-ID")}
                    </p>
                    {productRatings[item.id] && (
                      <div className="mt-1 flex items-center gap-1">
                        <span className="text-sm">⭐</span>
                        <span
                          className={`text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}
                        >
                          {productRatings[item.id].averageRating || 0}
                        </span>
                        <span
                          className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
                        >
                          ({productRatings[item.id].totalRatings || 0})
                        </span>
                      </div>
                    )}
                    <p
                      className={`mt-1 text-xs ${
                        isOutOfStock
                          ? "text-red-500"
                          : isDark
                            ? "text-slate-300"
                            : "text-slate-600"
                      }`}
                    >
                      Stok: {Number.isFinite(stock) ? stock : "-"}
                    </p>

                    <button
                      onClick={() => handleAddToCart(item)}
                      disabled={isOutOfStock}
                      className={`mt-2 w-full rounded-2xl py-2 text-white transition-all duration-300 hover:shadow-lg ${
                        isOutOfStock
                          ? "bg-slate-400 cursor-not-allowed"
                          : isDark
                            ? "bg-indigo-600 hover:bg-indigo-700"
                            : "bg-orange-500 hover:bg-orange-600"
                      }`}
                    >
                      {isOutOfStock ? "Stok Habis" : "Tambah Pesanan"}
                    </button>
                  </div>
                );
              })(),
            )
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-12">
        <div
          className={`rounded-4xl border p-6 shadow-lg ${
            isDark
              ? "border-slate-800 bg-slate-900"
              : "border-orange-100 bg-white"
          }`}
        >
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Produk selalu fresh",
                description:
                  "Katalog diupdate berkala supaya stok dan pilihan produk tetap relevan.",
              },
              {
                title: "Belanja lebih cepat",
                description:
                  "Cukup pilih produk favorit, lalu tambah ke keranjang tanpa langkah yang rumit.",
              },
              {
                title: "Informasi lebih lengkap",
                description:
                  "Harga, stok, dan kategori langsung terlihat supaya keputusan belanja lebih mudah.",
              },
            ].map((item, index) => (
              <article
                key={item.title}
                ref={(el) => {
                  infoCardRefs.current[index] = el;
                }}
                className={`rounded-2xl border p-5 ${
                  isDark
                    ? "border-slate-800 bg-slate-950"
                    : "border-orange-100 bg-orange-50/60"
                }`}
              >
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p
                  className={`mt-2 text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}
                >
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section
        ref={contentSectionRef}
        className={`relative overflow-hidden px-6 py-10 bg-cover bg-center bg-no-repeat ${
          isDark ? "text-slate-100" : "text-white"
        }`}
        style={{
          backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.56), rgba(2, 6, 23, 0.56)), url("https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1600&q=80")`,
        }}
      >
        <div className="absolute inset-0 bg-linear-to-br from-slate-900/5 via-slate-900/10 to-slate-900/20" />

        <div className="relative mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold">Cara Menggunakan Aplikasi</h2>
          <p className="mt-2 text-sm text-slate-200">
            Ikuti langkah singkat berikut supaya pengalaman belanja lebih cepat
            dan nyaman.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {appSteps.map((step, index) => (
              <article
                key={step.title}
                ref={(el) => {
                  contentCardRefs.current[index] = el;
                }}
                className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md shadow-lg shadow-black/10"
              >
                <div className="text-2xl">{step.icon}</div>
                <h3 className="mt-3 text-base font-semibold text-white">
                  {index + 1}. {step.title}
                </h3>
                <p className="mt-2 text-sm text-slate-200">
                  {step.description}
                </p>
              </article>
            ))}
          </div>

          <h2 className="mt-10 text-2xl font-bold text-white">
            Keunggulan Aplikasi
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {advantages.map((item, index) => (
              <article
                key={item.title}
                ref={(el) => {
                  contentCardRefs.current[index + appSteps.length] = el;
                }}
                className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md shadow-lg shadow-black/10"
              >
                <h3 className="text-base font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-slate-200">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className={`px-6 py-10 ${isDark ? "bg-slate-900" : "bg-white"}`}>
        <div className="max-w-3xl mx-auto">
          <h2
            className={`text-2xl font-bold mb-3 text-center ${isDark ? "text-slate-100" : "text-slate-900"}`}
          >
            Contact Kami
          </h2>
          <p
            className={`mb-6 text-center text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}
          >
            Kirim pesanmu, nanti langsung diarahkan ke WhatsApp kami.
          </p>

          <form
            onSubmit={handleSubmitContact}
            className={`rounded-2xl border p-5 shadow-sm ${
              isDark
                ? "border-slate-700 bg-slate-800"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nama"
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${
                  isDark
                    ? "border-slate-600 bg-slate-900 text-slate-100 focus:border-indigo-400"
                    : "border-slate-200 bg-white text-slate-700 focus:border-slate-400"
                }`}
              />
              <textarea
                rows={4}
                placeholder="Tulis pesan kamu..."
                value={contactMessage}
                onChange={(event) => setContactMessage(event.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${
                  isDark
                    ? "border-slate-600 bg-slate-900 text-slate-100 focus:border-indigo-400"
                    : "border-slate-200 bg-white text-slate-700 focus:border-slate-400"
                }`}
              />
            </div>
            <button
              type="submit"
              className="mt-4 w-full rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-white transition hover:bg-emerald-600"
            >
              Kirim Pesan ke WhatsApp
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
