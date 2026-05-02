import { Link, NavLink, useNavigate } from "react-router-dom";
import { animate } from "animejs";
import { useEffect, useRef, useState } from "react";
import { getCartCount, readCartItems } from "../utils/cartStorage";
import { useSettings } from "../context/SettingsContext";
import socket from "../utils/socket";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();
  const { theme, toggleTheme, resetThemeToLight } = useSettings();
  const isDark = theme === "dark";
  const userMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    resetThemeToLight();
    navigate("/login");
  };

  useEffect(() => {
    const syncCartCount = () => {
      const cart = readCartItems();
      const totalItems = getCartCount(cart);
      setCartCount(totalItems);
    };

    syncCartCount();
    window.addEventListener("cart-updated", syncCartCount);
    window.addEventListener("storage", syncCartCount);

    return () => {
      window.removeEventListener("cart-updated", syncCartCount);
      window.removeEventListener("storage", syncCartCount);
    };
  }, []);

  useEffect(() => {
    const handleProductSync = () => {
      const cart = readCartItems();
      const totalItems = getCartCount(cart);
      setCartCount(totalItems);
    };

    socket.on("product:sync", handleProductSync);

    return () => {
      socket.off("product:sync", handleProductSync);
    };
  }, []);

  const navLinkClass = ({ isActive }) =>
    `rounded-full px-4 py-2 text-sm font-medium transition ${
      isActive
        ? "bg-orange-500 text-white shadow"
        : isDark
          ? "text-slate-200 hover:bg-slate-800 hover:text-orange-300"
          : "text-slate-700 hover:bg-orange-100 hover:text-orange-600"
    }`;

  useEffect(() => {
    if (!userMenuOpen || !userMenuRef.current) return;

    const animation = animate(userMenuRef.current, {
      opacity: [0, 1],
      y: [-8, 0],
      scale: [0.97, 1],
      duration: 550,
      easing: "outCubic",
    });

    return () => {
      animation.pause();
    };
  }, [userMenuOpen]);

  useEffect(() => {
    if (!open || !mobileMenuRef.current) return;

    const animation = animate(mobileMenuRef.current, {
      opacity: [0, 1],
      y: [-10, 0],
      duration: 500,
      easing: "outCubic",
    });

    return () => {
      animation.pause();
    };
  }, [open, mobileMenuVisible]);

  useEffect(() => {
    if (open) {
      setMobileMenuVisible(true);
      return;
    }

    if (!mobileMenuRef.current) {
      setMobileMenuVisible(false);
      return;
    }

    const animation = animate(mobileMenuRef.current, {
      opacity: [1, 0],
      y: [0, -8],
      duration: 420,
      easing: "outCubic",
    });

    const closeTimer = window.setTimeout(() => {
      setMobileMenuVisible(false);
    }, 420);

    return () => {
      animation.pause();
      window.clearTimeout(closeTimer);
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur transition-colors duration-300 ${
        isDark
          ? "border-slate-800 bg-slate-950/90"
          : "border-orange-100 bg-white/90"
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        <Link to="/home" className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-orange-400 to-orange-600 text-sm font-bold text-white">
            FS
          </span>
          <div>
            <p
              className={`text-sm font-semibold leading-tight ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              Fayda Store
            </p>
            <p
              className={`text-xs ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Snack Enak Setiap Hari
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={() => navigate("/checkout")}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white transition hover:bg-orange-600"
            aria-label="Keranjang"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
            >
              <path
                d="M3 4H5L7.2 14.2C7.4 15 8.1 15.5 8.9 15.5H17.1C17.9 15.5 18.6 15 18.8 14.2L20 8H6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="9" cy="19" r="1.3" fill="currentColor" />
              <circle cx="17" cy="19" r="1.3" fill="currentColor" />
            </svg>
            {cartCount > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition ${
              isDark
                ? "border-slate-700 text-slate-200 hover:bg-slate-800"
                : "border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
            onClick={() => setOpen((prev) => !prev)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            <span className="relative block h-6 w-6">
              <span
                className={`absolute left-0 top-1/2 h-0.5 w-6 -translate-y-1/2 bg-slate-700 transition-all duration-300 ${
                  open ? "translate-y-0 rotate-45" : "-translate-y-2 rotate-0"
                }`}
                style={{ backgroundColor: isDark ? "#e2e8f0" : "#334155" }}
              />
              <span
                className={`absolute left-0 top-1/2 h-0.5 w-6 -translate-y-1/2 bg-slate-700 transition-all duration-300 ${
                  open ? "opacity-0" : "opacity-100"
                }`}
                style={{ backgroundColor: isDark ? "#e2e8f0" : "#334155" }}
              />
              <span
                className={`absolute left-0 top-1/2 h-0.5 w-6 -translate-y-1/2 bg-slate-700 transition-all duration-300 ${
                  open ? "translate-y-0 -rotate-45" : "translate-y-2 rotate-0"
                }`}
                style={{ backgroundColor: isDark ? "#e2e8f0" : "#334155" }}
              />
            </span>
          </button>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <NavLink to="/home" className={navLinkClass}>
            Beranda
          </NavLink>
          <NavLink to="/produk" className={navLinkClass}>
            Produk
          </NavLink>
          <button
            type="button"
            onClick={() => navigate("/checkout")}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white transition hover:bg-orange-600"
            aria-label="Keranjang"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
            >
              <path
                d="M3 4H5L7.2 14.2C7.4 15 8.1 15.5 8.9 15.5H17.1C17.9 15.5 18.6 15 18.8 14.2L20 8H6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="9" cy="19" r="1.3" fill="currentColor" />
              <circle cx="17" cy="19" r="1.3" fill="currentColor" />
            </svg>
            {cartCount > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-lg transition ${
              isDark
                ? "border-slate-700 bg-slate-900 text-amber-300 hover:bg-slate-800"
                : "border-orange-100 bg-orange-50 text-orange-500 hover:bg-orange-100"
            }`}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Light mode" : "Dark mode"}
          >
            <span className="inline-flex items-center justify-center">
              {isDark ? "☀️" : "🌙"}
            </span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
                isDark
                  ? "border-slate-700 text-slate-200 hover:bg-slate-800"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-600">
                U
              </span>
              Akun
            </button>

            {userMenuOpen ? (
              <div
                ref={userMenuRef}
                className={`absolute right-0 mt-2 w-44 rounded-xl border p-2 shadow-lg ${
                  isDark
                    ? "border-slate-700 bg-slate-900"
                    : "border-slate-200 bg-white"
                }`}
              >
                <Link
                  to="/profile"
                  className={`block rounded-lg px-3 py-2 text-sm transition ${
                    isDark
                      ? "text-slate-200 hover:bg-slate-800 hover:text-orange-300"
                      : "text-slate-700 hover:bg-orange-50 hover:text-orange-600"
                  }`}
                  onClick={() => setUserMenuOpen(false)}
                >
                  Profile
                </Link>
                <button
                  type="button"
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {mobileMenuVisible ? (
        <div
          ref={mobileMenuRef}
          className={`border-t px-4 pb-4 pt-3 md:hidden ${
            isDark
              ? "border-slate-800 bg-slate-950"
              : "border-orange-100 bg-white"
          }`}
        >
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                isDark
                  ? "border-slate-700 text-amber-300 hover:bg-slate-800"
                  : "border-orange-200 text-orange-600 hover:bg-orange-50"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <span className="inline-flex items-center justify-center">
                  {isDark ? "☀️" : "🌙"}
                </span>
                {isDark ? "Light Mode" : "Dark Mode"}
              </span>
            </button>
            <NavLink
              to="/home"
              className={navLinkClass}
              onClick={() => setOpen(false)}
            >
              Beranda
            </NavLink>
            <NavLink
              to="/produk"
              className={navLinkClass}
              onClick={() => setOpen(false)}
            >
              Produk
            </NavLink>
            <NavLink
              to="/profile"
              className={navLinkClass}
              onClick={() => setOpen(false)}
            >
              Profile
            </NavLink>
            <button
              type="button"
              className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-500"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
