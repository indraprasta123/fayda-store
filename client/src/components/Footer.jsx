import { Link } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";

export default function Footer() {
  const { theme } = useSettings();
  const isDark = theme === "dark";

  return (
    <footer
      className={`border-t ${
        isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"
      }`}
    >
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-3">
          <section>
            <h3
              className={`text-xl font-bold ${
                isDark ? "text-slate-100" : "text-slate-900"
              }`}
            >
              Fayda Store
            </h3>
            <p
              className={`mt-3 text-sm leading-relaxed ${
                isDark ? "text-slate-300" : "text-slate-600"
              }`}
            >
              Toko camilan favorit dengan pengalaman belanja cepat, praktis, dan
              nyaman. Hubungi kami kapan saja untuk tanya produk atau pemesanan.
            </p>

            <div className="mt-4 space-y-2 text-sm">
              <p className={isDark ? "text-slate-300" : "text-slate-700"}>
                📍 Alamat: Fayda Store
              </p>
              <p className={isDark ? "text-slate-300" : "text-slate-700"}>
                📞 WhatsApp: 085740529930
              </p>
            </div>

            <a
              href="https://wa.me/6285740529930"
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              Chat WhatsApp
            </a>
          </section>

          <section>
            <h4
              className={`text-base font-semibold ${
                isDark ? "text-slate-100" : "text-slate-900"
              }`}
            >
              Navigasi
            </h4>
            <nav className="mt-3 space-y-2 text-sm">
              <Link
                to="/home"
                className={`block transition ${
                  isDark
                    ? "text-slate-300 hover:text-indigo-300"
                    : "text-slate-600 hover:text-orange-500"
                }`}
              >
                Beranda
              </Link>
              <Link
                to="/produk"
                className={`block transition ${
                  isDark
                    ? "text-slate-300 hover:text-indigo-300"
                    : "text-slate-600 hover:text-orange-500"
                }`}
              >
                Produk
              </Link>
              <Link
                to="/riwayat-pesanan"
                className={`block transition ${
                  isDark
                    ? "text-slate-300 hover:text-indigo-300"
                    : "text-slate-600 hover:text-orange-500"
                }`}
              >
                Riwayat Pesanan
              </Link>
              <Link
                to="/profile"
                className={`block transition ${
                  isDark
                    ? "text-slate-300 hover:text-indigo-300"
                    : "text-slate-600 hover:text-orange-500"
                }`}
              >
                Profile
              </Link>
            </nav>
          </section>

          <section>
            <h4
              className={`text-base font-semibold ${
                isDark ? "text-slate-100" : "text-slate-900"
              }`}
            >
              Lokasi Toko
            </h4>
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3953.799997561713!2d109.9585267752516!3d-7.704599592313056!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e7aebed623cf17d%3A0x48c8845ee5f3ea36!2sFayda%20store!5e0!3m2!1sid!2sid!4v1775921723266!5m2!1sid!2sid"
                width="100%"
                height="220"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Lokasi Fayda Store"
              />
            </div>
          </section>
        </div>

        <div
          className={`mt-8 border-t pt-4 text-center text-xs ${
            isDark
              ? "border-slate-800 text-slate-400"
              : "border-slate-200 text-slate-500"
          }`}
        >
          © {new Date().getFullYear()} Fayda Store. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
