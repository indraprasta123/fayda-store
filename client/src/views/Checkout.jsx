import { animate } from "animejs";
import { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { Link, useNavigate } from "react-router-dom";
import {
  getCartCount,
  readCartItems,
  writeCartItems,
} from "../utils/cartStorage";
import { useSettings } from "../context/SettingsContext";

export default function Checkout() {
  const navigate = useNavigate();
  const { theme } = useSettings();
  const isDark = theme === "dark";
  const [cart, setCart] = useState([]);
  const [isCartInitialized, setIsCartInitialized] = useState(false);
  const headerRef = useRef(null);
  const cartItemsRef = useRef([]);
  const summaryRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    const syncCart = () => {
      setCart(readCartItems());
      setIsCartInitialized(true);
    };

    syncCart();
    window.addEventListener("storage", syncCart);
    window.addEventListener("focus", syncCart);

    return () => {
      window.removeEventListener("storage", syncCart);
      window.removeEventListener("focus", syncCart);
    };
  }, []);

  useEffect(() => {
    if (!isCartInitialized) return;
    writeCartItems(cart);
  }, [cart, isCartInitialized]);

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

    if (cartItemsRef.current.length > 0) {
      animations.push(
        animate(cartItemsRef.current.filter(Boolean), {
          opacity: [0, 1],
          y: [18, 0],
          delay: (_, index) => 180 + index * 100,
          duration: 760,
          easing: "outExpo",
        }),
      );
    }

    if (summaryRef.current) {
      animations.push(
        animate(summaryRef.current, {
          opacity: [0, 1],
          y: [24, 0],
          delay: 220,
          duration: 900,
          easing: "outExpo",
        }),
      );
    }

    return () => {
      animations.forEach((animation) => animation.pause());
    };
  }, [cart.length]);

  const increaseQty = (id) => {
    setCart(
      cart.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity:
                Number.isFinite(Number(item.stock)) && Number(item.stock) > 0
                  ? Math.min(item.quantity + 1, Number(item.stock))
                  : item.quantity + 1,
            }
          : item,
      ),
    );
  };

  const decreaseQty = (id) => {
    setCart(
      cart.map((item) =>
        item.id === id
          ? { ...item, quantity: item.quantity > 1 ? item.quantity - 1 : 1 }
          : item,
      ),
    );
  };

  const deleteItem = (id) => {
    Swal.fire({
      title: "Hapus item?",
      text: "Item akan dihapus dari keranjang",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Hapus",
      cancelButtonText: "Batal",
    }).then((result) => {
      if (result.isConfirmed) {
        setCart(cart.filter((item) => item.id !== id));
        Swal.fire("Terhapus!", "Item berhasil dihapus.", "success");
      }
    });
  };

  const totalPrice = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );
  const totalItems = useMemo(() => getCartCount(cart), [cart]);

  const handleCheckout = () => {
    if (cart.length === 0) {
      Swal.fire("Keranjang kosong", "Tambahkan produk terlebih dahulu", "info");
      return;
    }
    navigate("/confirm-delivery");
  };

  return (
    <div
      className={`min-h-screen p-4 md:p-6 transition-colors duration-300 ${
        isDark
          ? "bg-linear-to-br from-slate-950 via-slate-900 to-slate-950"
          : "bg-linear-to-br from-orange-50 via-white to-amber-50"
      }`}
    >
      <div className="mx-auto w-full max-w-6xl">
        <section
          ref={headerRef}
          className={`mb-6 rounded-2xl px-6 py-6 text-white shadow-lg ${
            isDark
              ? "bg-linear-to-r from-slate-800 via-slate-700 to-slate-800"
              : "bg-linear-to-r from-orange-500 via-orange-500 to-amber-500"
          }`}
        >
          <h1 className="text-3xl font-bold md:text-4xl">Checkout</h1>
          <p className="mt-2 text-sm text-orange-50 md:text-base">
            Review produk pilihanmu sebelum lanjut ke pembayaran.
          </p>
        </section>

        {cart.length === 0 ? (
          <div
            className={`rounded-2xl px-6 py-14 text-center shadow-sm ${
              isDark
                ? "border border-slate-700 bg-slate-900"
                : "border border-orange-100 bg-white"
            }`}
          >
            <p className={isDark ? "text-slate-300" : "text-slate-500"}>
              Keranjang Anda kosong.
            </p>
            <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
              <Link
                to="/home"
                className={`inline-flex rounded-lg px-4 py-2 text-sm font-medium text-white transition ${
                  isDark
                    ? "bg-indigo-600 hover:bg-indigo-700"
                    : "bg-orange-500 hover:bg-orange-600"
                }`}
              >
                Belanja Sekarang
              </Link>

              <Link
                to="/riwayat-pesanan"
                className={`inline-flex rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  isDark
                    ? "border-slate-600 text-indigo-300 hover:bg-slate-800"
                    : "border-orange-200 text-orange-600 hover:bg-orange-50"
                }`}
              >
                Lihat Riwayat Pesanan
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              {cart.map((item, index) => (
                <div
                  key={item.id}
                  ref={(element) => {
                    cartItemsRef.current[index] = element;
                  }}
                  className={`rounded-2xl p-4 shadow-sm ${
                    isDark
                      ? "border border-slate-700 bg-slate-900"
                      : "border border-orange-100 bg-white"
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-20 w-20 rounded-lg object-cover"
                    />

                    <div className="min-w-0 flex-1">
                      <h2
                        className={`truncate text-base font-semibold ${
                          isDark ? "text-slate-100" : "text-slate-800"
                        }`}
                      >
                        {item.name}
                      </h2>
                      <p
                        className={`mt-1 text-sm ${isDark ? "text-slate-300" : "text-slate-500"}`}
                      >
                        Rp {Number(item.price || 0).toLocaleString("id-ID")}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => decreaseQty(item.id)}
                          className={`h-8 w-8 rounded-md border text-sm font-semibold transition ${
                            isDark
                              ? "border-slate-600 text-indigo-300 hover:bg-slate-800"
                              : "border-orange-200 text-orange-600 hover:bg-orange-50"
                          }`}
                        >
                          -
                        </button>
                        <span
                          className={`min-w-7 text-center text-sm font-semibold ${
                            isDark ? "text-slate-100" : "text-slate-700"
                          }`}
                        >
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => increaseQty(item.id)}
                          disabled={
                            Number.isFinite(Number(item.stock)) &&
                            Number(item.stock) > 0 &&
                            item.quantity >= Number(item.stock)
                          }
                          className={`h-8 w-8 rounded-md border text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                            isDark
                              ? "border-slate-600 text-indigo-300 hover:bg-slate-800"
                              : "border-orange-200 text-orange-600 hover:bg-orange-50"
                          }`}
                        >
                          +
                        </button>
                        {Number.isFinite(Number(item.stock)) &&
                        Number(item.stock) > 0 ? (
                          <span
                            className={`text-xs ${isDark ? "text-slate-300" : "text-slate-500"}`}
                          >
                            Stok: {Number(item.stock)}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => deleteItem(item.id)}
                          className="ml-1 rounded-md bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <p
                      className={`text-sm font-bold sm:text-base ${
                        isDark ? "text-slate-100" : "text-slate-800"
                      }`}
                    >
                      Rp {(item.price * item.quantity).toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <aside
              ref={summaryRef}
              className={`h-fit rounded-2xl p-5 shadow-sm ${
                isDark
                  ? "border border-slate-700 bg-slate-900"
                  : "border border-orange-100 bg-white"
              }`}
            >
              <h2
                className={`text-lg font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}
              >
                Ringkasan
              </h2>
              <div
                className={`mt-4 space-y-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}
              >
                <div className="flex items-center justify-between">
                  <span>Total Item</span>
                  <span
                    className={`font-medium ${isDark ? "text-slate-100" : "text-slate-800"}`}
                  >
                    {totalItems}
                  </span>
                </div>
                <div
                  className={`flex items-center justify-between pt-2 ${
                    isDark
                      ? "border-t border-slate-700"
                      : "border-t border-orange-100"
                  }`}
                >
                  <span>Total Harga</span>
                  <span
                    className={`text-base font-bold ${isDark ? "text-indigo-300" : "text-orange-600"}`}
                  >
                    Rp {totalPrice.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                className={`mt-5 w-full rounded-lg py-2.5 text-sm font-semibold text-white transition ${
                  isDark
                    ? "bg-indigo-600 hover:bg-indigo-700"
                    : "bg-orange-500 hover:bg-orange-600"
                }`}
              >
                Proceed to Payment
              </button>

              <button
                type="button"
                onClick={() => navigate("/riwayat-pesanan")}
                className={`mt-2 w-full rounded-lg border py-2.5 text-sm font-semibold transition ${
                  isDark
                    ? "border-slate-600 text-indigo-300 hover:bg-slate-800"
                    : "border-orange-200 text-orange-600 hover:bg-orange-50"
                }`}
              >
                Lihat Riwayat Pesanan
              </button>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
