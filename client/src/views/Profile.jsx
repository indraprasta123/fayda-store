import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { animate } from "animejs";
import { useSettings } from "../context/SettingsContext";
import api from "../api/axios";
import Swal from "sweetalert2";

export default function Profile() {
  const { theme } = useSettings();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    date_of_birth: "",
  });

  const headerRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get("/pub/profile");
      setUser(data);
      setFormData({
        name: data.name || "",
        email: data.email || "",
        phone: data.profile?.phone || "",
        gender: data.profile?.gender || "",
        date_of_birth: data.profile?.date_of_birth
          ? new Date(data.profile.date_of_birth).toISOString().split("T")[0]
          : "",
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal Memuat Profile",
        text: error.response?.data?.message || "Terjadi kesalahan",
        confirmButtonColor: isDark ? "#4f46e5" : "#f97316",
      }).then(() => {
        navigate("/login");
      });
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
          duration: 900,
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
          duration: 900,
          easing: "outExpo",
        }),
      );
    }

    return () => animations.forEach((a) => a.pause());
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveProfile = async () => {
    try {
      if (!formData.name || !formData.email) {
        Swal.fire({
          icon: "warning",
          title: "Data Tidak Lengkap",
          text: "Nama dan email harus diisi",
          confirmButtonColor: isDark ? "#4f46e5" : "#f97316",
        });
        return;
      }

      setIsSaving(true);
      const { data } = await api.patch("/pub/profile", formData);

      setUser(data.user);
      setIsEditing(false);

      Swal.fire({
        icon: "success",
        title: "Profile Berhasil Diperbarui",
        confirmButtonColor: isDark ? "#4f46e5" : "#f97316",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal Memperbarui Profile",
        text: error.response?.data?.message || "Terjadi kesalahan",
        confirmButtonColor: isDark ? "#4f46e5" : "#f97316",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.profile?.phone || "",
      gender: user?.profile?.gender || "",
      date_of_birth: user?.profile?.date_of_birth
        ? new Date(user.profile.date_of_birth).toISOString().split("T")[0]
        : "",
    });
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
          isDark
            ? "bg-linear-to-br from-slate-950 via-slate-900 to-slate-950"
            : "bg-linear-to-br from-orange-50 via-white to-amber-50"
        }`}
      >
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-orange-500 mb-3"></div>
          <p
            className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}
          >
            Memuat profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen p-4 md:p-6 transition-colors duration-300 ${
        isDark
          ? "bg-linear-to-br from-slate-950 via-slate-900 to-slate-950"
          : "bg-linear-to-br from-orange-50 via-white to-amber-50"
      }`}
    >
      <div className="mx-auto max-w-2xl">
        {/* HEADER */}
        <section
          ref={headerRef}
          className={`mb-6 rounded-2xl px-6 py-8 text-white shadow-lg ${
            isDark
              ? "bg-linear-to-r from-slate-800 to-slate-700"
              : "bg-linear-to-r from-orange-500 to-amber-500"
          }`}
        >
          <h1 className="text-3xl font-bold md:text-4xl">Profile Saya</h1>
          <p className="mt-2 text-sm md:text-base text-orange-50">
            Kelola informasi pribadi dan kontak kamu
          </p>
        </section>

        {/* CONTENT */}
        <div
          ref={contentRef}
          className={`rounded-2xl p-6 md:p-8 shadow-sm ${
            isDark
              ? "bg-slate-900 border border-slate-700"
              : "bg-white border border-orange-100"
          }`}
        >
          {!isEditing ? (
            // VIEW MODE
            <div className="space-y-6">
              {/* PROFILE HEADER */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                      isDark
                        ? "bg-indigo-600 text-white"
                        : "bg-orange-500 text-white"
                    }`}
                  >
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <h2
                      className={`text-2xl font-bold ${
                        isDark ? "text-slate-100" : "text-slate-800"
                      }`}
                    >
                      {user?.name || "-"}
                    </h2>
                    <p
                      className={`text-sm ${
                        isDark ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      {user?.role === "admin" ? "Admin" : "User"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className={`rounded-lg px-6 py-2 font-semibold transition-all ${
                    isDark
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                      : "bg-orange-500 hover:bg-orange-600 text-white"
                  }`}
                >
                  Edit Profile
                </button>
              </div>

              <hr
                className={`${
                  isDark ? "border-slate-700" : "border-orange-100"
                }`}
              />

              {/* DETAILS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Email */}
                <div>
                  <p
                    className={`text-sm font-medium mb-1 ${
                      isDark ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    Email
                  </p>
                  <p
                    className={`text-base font-medium ${
                      isDark ? "text-slate-200" : "text-slate-800"
                    }`}
                  >
                    {user?.email || "-"}
                  </p>
                </div>

                {/* Phone */}
                <div>
                  <p
                    className={`text-sm font-medium mb-1 ${
                      isDark ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    Nomor Telepon
                  </p>
                  <p
                    className={`text-base font-medium ${
                      isDark ? "text-slate-200" : "text-slate-800"
                    }`}
                  >
                    {user?.profile?.phone || "-"}
                  </p>
                </div>

                {/* Gender */}
                <div>
                  <p
                    className={`text-sm font-medium mb-1 ${
                      isDark ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    Jenis Kelamin
                  </p>
                  <p
                    className={`text-base font-medium ${
                      isDark ? "text-slate-200" : "text-slate-800"
                    }`}
                  >
                    {user?.profile?.gender === "male"
                      ? "Laki-laki"
                      : user?.profile?.gender === "female"
                        ? "Perempuan"
                        : "-"}
                  </p>
                </div>

                {/* Date of Birth */}
                <div>
                  <p
                    className={`text-sm font-medium mb-1 ${
                      isDark ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    Tanggal Lahir
                  </p>
                  <p
                    className={`text-base font-medium ${
                      isDark ? "text-slate-200" : "text-slate-800"
                    }`}
                  >
                    {user?.profile?.date_of_birth
                      ? new Date(user.profile.date_of_birth).toLocaleDateString(
                          "id-ID",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          },
                        )
                      : "-"}
                  </p>
                </div>

                {/* Member Since */}
                <div>
                  <p
                    className={`text-sm font-medium mb-1 ${
                      isDark ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    Member Sejak
                  </p>
                  <p
                    className={`text-base font-medium ${
                      isDark ? "text-slate-200" : "text-slate-800"
                    }`}
                  >
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("id-ID", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "-"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // EDIT MODE
            <div className="space-y-5">
              <h3
                className={`text-xl font-bold ${
                  isDark ? "text-slate-100" : "text-slate-800"
                }`}
              >
                Edit Profile
              </h3>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full rounded-lg border px-4 py-2 text-sm outline-hidden transition ${
                      isDark
                        ? "border-slate-600 bg-slate-800 text-slate-100 focus:border-indigo-500"
                        : "border-orange-200 bg-white text-slate-900 focus:border-orange-400"
                    }`}
                  />
                </div>

                {/* Email */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full rounded-lg border px-4 py-2 text-sm outline-hidden transition ${
                      isDark
                        ? "border-slate-600 bg-slate-800 text-slate-100 focus:border-indigo-500"
                        : "border-orange-200 bg-white text-slate-900 focus:border-orange-400"
                    }`}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Nomor Telepon
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full rounded-lg border px-4 py-2 text-sm outline-hidden transition ${
                      isDark
                        ? "border-slate-600 bg-slate-800 text-slate-100 focus:border-indigo-500"
                        : "border-orange-200 bg-white text-slate-900 focus:border-orange-400"
                    }`}
                  />
                </div>

                {/* Gender */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Jenis Kelamin
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className={`w-full rounded-lg border px-4 py-2 text-sm outline-hidden transition ${
                      isDark
                        ? "border-slate-600 bg-slate-800 text-slate-100 focus:border-indigo-500"
                        : "border-orange-200 bg-white text-slate-900 focus:border-orange-400"
                    }`}
                  >
                    <option value="">Pilih Jenis Kelamin</option>
                    <option value="male">Laki-laki</option>
                    <option value="female">Perempuan</option>
                  </select>
                </div>

                {/* Date of Birth */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Tanggal Lahir
                  </label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleInputChange}
                    className={`w-full rounded-lg border px-4 py-2 text-sm outline-hidden transition ${
                      isDark
                        ? "border-slate-600 bg-slate-800 text-slate-100 focus:border-indigo-500"
                        : "border-orange-200 bg-white text-slate-900 focus:border-orange-400"
                    }`}
                  />
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                    isDark
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-indigo-600/50"
                      : "bg-orange-500 hover:bg-orange-600 text-white disabled:bg-orange-500/50"
                  }`}
                >
                  {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold border transition-all ${
                    isDark
                      ? "border-slate-600 text-indigo-400 hover:bg-slate-800 disabled:opacity-50"
                      : "border-orange-200 text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                  }`}
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>

        {/* BACK BUTTON */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => navigate("/")}
            className={`rounded-lg border px-6 py-2 font-medium transition-all ${
              isDark
                ? "border-slate-600 text-indigo-400 hover:bg-slate-800"
                : "border-orange-200 text-orange-600 hover:bg-orange-50"
            }`}
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    </div>
  );
}
