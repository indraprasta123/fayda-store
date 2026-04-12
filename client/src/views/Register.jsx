import { animate } from "animejs";
import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Swal from "sweetalert2";
import api from "../api/axios";
import { useSettings } from "../context/SettingsContext";

export default function Register() {
  const navigate = useNavigate();
  const { language } = useSettings();
  const isId = language === "id";
  const canvasRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let frameId;
    const animations = [];
    const particlesCount = 42;

    const particles = Array.from({ length: particlesCount }, () => ({
      x: 0,
      y: 0,
      radius: Math.random() * 2 + 1,
      alpha: Math.random() * 0.5 + 0.2,
      blur: Math.random() * 10 + 4,
    }));

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      particles.forEach((particle) => {
        particle.x = Math.random() * canvas.width;
        particle.y = Math.random() * canvas.height;
      });
    };

    const render = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        context.beginPath();
        context.fillStyle = `rgba(249, 115, 22, ${particle.alpha})`;
        context.shadowColor = "rgba(251, 191, 36, 0.45)";
        context.shadowBlur = particle.blur;
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();
      });

      frameId = window.requestAnimationFrame(render);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    particles.forEach((particle) => {
      const animation = animate(particle, {
        x: () => Math.random() * canvas.width,
        y: () => Math.random() * canvas.height,
        alpha: () => Math.random() * 0.55 + 0.15,
        duration: () => Math.random() * 6000 + 5000,
        delay: () => Math.random() * 900,
        easing: "inOutSine",
        loop: true,
        alternate: true,
      });

      animations.push(animation);
    });

    render();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.cancelAnimationFrame(frameId);
      animations.forEach((animation) => animation.pause());
    };
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      Swal.fire({
        icon: "warning",
        title: isId ? "Form belum lengkap" : "Incomplete form",
        text: isId ? "Silakan isi semua field" : "Please fill in all fields",
      });
      return;
    }

    if (form.password !== form.confirmPassword) {
      Swal.fire({
        icon: "warning",
        title: isId ? "Password tidak cocok" : "Passwords do not match",
        text: isId
          ? "Pastikan password dan konfirmasi password sama"
          : "Ensure password and confirmation are the same",
      });
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/register", {
        name: form.name,
        email: form.email,
        password: form.password,
      });

      Swal.fire({
        icon: "success",
        title: isId ? "Registrasi berhasil" : "Registration successful",
        text: isId
          ? "Silakan login untuk melanjutkan"
          : "Please login to continue",
      });

      navigate("/login");
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: isId ? "Registrasi gagal" : "Registration failed",
        text:
          error.response?.data?.message ||
          (isId ? "Terjadi kesalahan" : "Something went wrong"),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-orange-950 via-orange-900 to-amber-900 px-4 py-10">
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.26),transparent_40%),radial-gradient(circle_at_bottom,rgba(251,191,36,0.16),transparent_45%)]" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200/20 bg-white/90 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <h2 className="text-center text-2xl font-semibold text-slate-900">
          {isId ? "Daftar" : "Register"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="text-sm font-medium text-slate-700"
            >
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <div className="flex items-center gap-2">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-50"
              >
                {showPassword ? "✕" : "👁"}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-medium text-slate-700"
            >
              {isId ? "Konfirmasi Password" : "Confirm Password"}
            </label>
            <div className="flex items-center gap-2">
              <input
                type={showConfirm ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((prev) => !prev)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-50"
              >
                {showConfirm ? "✕" : "👁"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading
              ? isId
                ? "Memuat..."
                : "Loading..."
              : isId
                ? "Daftar"
                : "Register"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          {isId ? "Sudah punya akun?" : "Already have an account?"}{" "}
          <Link
            to="/login"
            className="font-medium text-orange-600 hover:text-orange-700"
          >
            {isId ? "Masuk" : "Login"}
          </Link>
        </p>
      </div>
    </section>
  );
}
