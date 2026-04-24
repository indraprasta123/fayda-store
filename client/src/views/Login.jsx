import { GoogleLogin } from "@react-oauth/google";
import { useNavigate, Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { animate } from "animejs";
import api from "../api/axios";
import { setLoginSuccess } from "../store/authSlice";
import Swal from "sweetalert2";
import { useSettings } from "../context/SettingsContext";

const parseJwtPayload = (token) => {
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(normalized);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { language } = useSettings();
  const isId = language === "id";
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const adminDashboardUrl =
    import.meta.env.VITE_ADMIN_DASHBOARD_URL ||
    "https://admin-fayda-store.web.app/dashboard";
  const canvasRef = useRef(null);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const redirectAdminWithToken = (accessToken, role) => {
    const dashboardUrl = new URL(adminDashboardUrl);
    dashboardUrl.searchParams.set("access_token", accessToken);
    dashboardUrl.searchParams.set("role", role);
    window.location.assign(dashboardUrl.toString());
  };

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

    if (!form.email || !form.password) {
      Swal.fire({
        icon: "warning",
        title: isId ? "Form belum lengkap" : "Incomplete form",
        text: isId
          ? "Silakan isi email dan password Anda."
          : "Please enter your email and password.",
      });
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", form);

      const userPayload = data.user || {
        id: data.id || null,
        name: data.name || form.email.split("@")[0],
        email: data.email || form.email,
        phone: data.phone || "",
        profileImg: data.profileImg || "",
      };

      const tokenRole = data.access_token
        ? parseJwtPayload(data.access_token)?.role
        : null;
      const resolvedRole = userPayload.role || tokenRole || "user";

      const normalizedUserPayload = {
        ...userPayload,
        role: resolvedRole,
      };

      dispatch(
        setLoginSuccess({
          access_token: data.access_token,
          user: normalizedUserPayload,
        }),
      );

      if (resolvedRole === "admin") {
        redirectAdminWithToken(data.access_token, resolvedRole);
        return;
      }

      navigate("/home");
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: isId ? "Login gagal" : "Login failed",
        text:
          error.response?.data?.message ||
          (isId ? "Login gagal" : "Login failed"),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const { data } = await api.post("/auth/google-login", {
        credential: credentialResponse.credential,
      });

      const tokenRole = data.access_token
        ? parseJwtPayload(data.access_token)?.role
        : null;
      const resolvedRole = data.user?.role || tokenRole || "user";
      const normalizedUserPayload = {
        ...(data.user || {}),
        role: resolvedRole,
      };

      dispatch(
        setLoginSuccess({
          access_token: data.access_token,
          user: normalizedUserPayload,
        }),
      );

      if (resolvedRole === "admin") {
        redirectAdminWithToken(data.access_token, resolvedRole);
        return;
      }

      navigate("/home");
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: isId ? "Login gagal" : "Login failed",
        text:
          error.response?.data?.message ||
          (isId ? "Login Google gagal" : "Google login failed"),
      });
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();

    if (!forgotEmail) {
      Swal.fire({
        icon: "warning",
        title: isId ? "Email wajib diisi" : "Email is required",
      });
      return;
    }

    setForgotLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", {
        email: forgotEmail,
      });

      Swal.fire({
        icon: "success",
        title: isId ? "Email terkirim" : "Email sent",
        text:
          data?.message ||
          (isId
            ? "Cek inbox/spam untuk melihat token reset password."
            : "Check inbox/spam to get your reset token."),
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: isId ? "Gagal" : "Failed",
        text:
          error?.response?.data?.message ||
          (isId
            ? "Tidak bisa membuat token reset"
            : "Unable to create reset token"),
      });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();

    if (!resetToken || !newPassword) {
      Swal.fire({
        icon: "warning",
        title: isId
          ? "Token dan password wajib"
          : "Token and password required",
      });
      return;
    }

    setResetLoading(true);
    try {
      const { data } = await api.post("/auth/reset-password", {
        token: resetToken,
        password: newPassword,
      });

      Swal.fire({
        icon: "success",
        title: isId ? "Berhasil" : "Success",
        text:
          data?.message ||
          (isId ? "Password berhasil diubah" : "Password updated"),
      });

      setForgotOpen(false);
      setResetToken("");
      setNewPassword("");
      setForgotEmail("");
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: isId ? "Gagal" : "Failed",
        text:
          error?.response?.data?.message ||
          (isId ? "Tidak bisa ubah password" : "Unable to reset password"),
      });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-orange-950 via-orange-900 to-amber-900 px-4 py-10">
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.26),transparent_40%),radial-gradient(circle_at_bottom,rgba(251,191,36,0.16),transparent_45%)]" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200/20 bg-white/90 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <h2 className="text-center text-2xl font-semibold text-slate-900">
          {isId ? "Masuk" : "Login"}
        </h2>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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
              autoComplete="username"
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
                autoComplete="current-password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              />
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-50"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={
                  showPassword
                    ? isId
                      ? "Sembunyikan password"
                      : "Hide password"
                    : isId
                      ? "Lihat password"
                      : "Show password"
                }
                title={
                  showPassword
                    ? isId
                      ? "Sembunyikan password"
                      : "Hide password"
                    : isId
                      ? "Lihat password"
                      : "Show password"
                }
              >
                {showPassword ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                    className="h-5 w-5"
                  >
                    <path
                      d="M3 3L21 21"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M10.58 10.58C10.21 10.95 10 11.46 10 12C10 13.1 10.9 14 12 14C12.54 14 13.05 13.79 13.42 13.42"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M9.88 5.09C10.56 4.87 11.27 4.75 12 4.75C16.5 4.75 20.13 9.21 21 12C20.66 13.1 20.03 14.26 19.15 15.3"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M6.61 6.61C4.79 7.84 3.52 9.73 3 12C3.87 14.79 7.5 19.25 12 19.25C13.89 19.25 15.54 18.46 16.88 17.34"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                    className="h-5 w-5"
                  >
                    <path
                      d="M2.25 12C3.29 8.83 7.11 4.75 12 4.75C16.89 4.75 20.71 8.83 21.75 12C20.71 15.17 16.89 19.25 12 19.25C7.11 19.25 3.29 15.17 2.25 12Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            className="w-full rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
            type="submit"
            disabled={loading}
          >
            {loading
              ? isId
                ? "Memuat..."
                : "Loading..."
              : isId
                ? "Masuk"
                : "Login"}
          </button>

          <button
            type="button"
            className="w-full text-right text-sm font-medium text-orange-600 transition hover:text-orange-700"
            onClick={() => setForgotOpen((prev) => !prev)}
          >
            {isId ? "Lupa password?" : "Forgot password?"}
          </button>
        </form>

        {forgotOpen ? (
          <div className="mt-5 space-y-4 rounded-xl border border-orange-200 bg-orange-50/60 p-4">
            <p className="text-sm font-semibold text-slate-800">
              {isId ? "Reset Password" : "Reset Password"}
            </p>

            <form className="space-y-3" onSubmit={handleForgotPassword}>
              <label className="block text-xs font-medium text-slate-600">
                {isId ? "Email akun" : "Account email"}
              </label>
              <input
                type="email"
                value={forgotEmail}
                onChange={(event) => setForgotEmail(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              />
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {forgotLoading
                  ? isId
                    ? "Memproses..."
                    : "Processing..."
                  : isId
                    ? "Kirim Token Reset"
                    : "Generate Reset Token"}
              </button>
            </form>

            <form className="space-y-3" onSubmit={handleResetPassword}>
              <label className="block text-xs font-medium text-slate-600">
                {isId ? "Token reset" : "Reset token"}
              </label>
              <input
                type="text"
                value={resetToken}
                onChange={(event) => setResetToken(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              />

              <label className="block text-xs font-medium text-slate-600">
                {isId ? "Password baru" : "New password"}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              />

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {resetLoading
                  ? isId
                    ? "Memperbarui..."
                    : "Updating..."
                  : isId
                    ? "Ubah Password"
                    : "Update Password"}
              </button>
            </form>
          </div>
        ) : null}

        <div className="my-5 flex items-center gap-3 text-sm text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          <span>{isId ? "atau" : "or"}</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="flex justify-center">
          {googleClientId ? (
            <GoogleLogin
              locale="en"
              text="signin_with"
              onSuccess={handleGoogleSuccess}
              onError={() => {
                Swal.fire({
                  icon: "error",
                  title: isId ? "Login gagal" : "Login failed",
                  text: isId ? "Login Google gagal" : "Google login failed",
                });
              }}
            />
          ) : (
            <p className="text-center text-xs text-slate-500">
              {isId
                ? "Google Login belum aktif. Tambahkan VITE_GOOGLE_CLIENT_ID di .env"
                : "Google Login is not enabled yet. Add VITE_GOOGLE_CLIENT_ID in .env"}
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          {isId ? "Belum punya akun?" : "Don't have an account?"}{" "}
          <Link
            to="/register"
            className="font-medium text-orange-600 hover:text-orange-700"
          >
            {isId ? "Daftar sekarang" : "Register now"}
          </Link>
        </p>
      </div>
    </section>
  );
}
