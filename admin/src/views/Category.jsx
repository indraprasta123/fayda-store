import { animate } from "animejs";
import { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import api from "../api/axios";
import Sidebar from "../components/Sidebar";

export default function Category() {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  const [form, setForm] = useState({
    id: null,
    name: "",
  });

  const headerRef = useRef(null);
  const cardRef = useRef(null);
  const tableRef = useRef(null);
  const mobileCardsRef = useRef([]);

  // ========================
  // FETCH DATA
  // ========================
  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const { data } = await api.get("/admin/categories");
      const categoryData = Array.isArray(data?.categories)
        ? data.categories
        : Array.isArray(data)
          ? data
          : [];

      setCategories(categoryData);
    } catch (error) {
      setCategories([]);
      setErrorMessage(
        error?.response?.data?.message || "Gagal mengambil data kategori",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
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

    if (cardRef.current) {
      animations.push(
        animate(cardRef.current, {
          opacity: [0, 1],
          y: [22, 0],
          delay: 180,
          duration: 900,
          easing: "outExpo",
        }),
      );
    }

    if (tableRef.current) {
      animations.push(
        animate(tableRef.current, {
          opacity: [0, 1],
          y: [24, 0],
          delay: 260,
          duration: 900,
          easing: "outExpo",
        }),
      );
    }

    if (mobileCardsRef.current.length > 0) {
      animations.push(
        animate(mobileCardsRef.current.filter(Boolean), {
          opacity: [0, 1],
          y: [16, 0],
          delay: (_, index) => 220 + index * 100,
          duration: 760,
          easing: "outExpo",
        }),
      );
    }

    return () => {
      animations.forEach((animation) => animation.pause());
    };
  }, [categories.length, isLoading]);

  // ========================
  // HANDLE INPUT
  // ========================
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // ========================
  // OPEN ADD
  // ========================
  const handleAdd = () => {
    setForm({ id: null, name: "" });
    setIsEdit(false);
    setShowModal(true);
  };

  // ========================
  // OPEN EDIT
  // ========================
  const handleEdit = (item) => {
    setForm(item);
    setIsEdit(true);
    setShowModal(true);
  };

  // ========================
  // SUBMIT
  // ========================
  const handleSubmit = async () => {
    if (!form.name) {
      return Swal.fire("Warning", "Nama category wajib diisi", "warning");
    }

    try {
      if (isEdit) {
        await api.patch(`/admin/categories/${form.id}`, form);
      } else {
        await api.post("/admin/categories", form);
      }

      Swal.fire("Success", "Berhasil disimpan", "success");
      setShowModal(false);
      fetchCategories();
    } catch (error) {
      Swal.fire("Error", "Gagal simpan", "error");
    }
  };

  // ========================
  // DELETE
  // ========================
  const handleDelete = async (id) => {
    const confirm = await Swal.fire({
      title: "Yakin?",
      text: "Data akan dihapus",
      icon: "warning",
      showCancelButton: true,
    });

    if (!confirm.isConfirmed) return;

    try {
      await api.delete(`/admin/categories/${id}`);
      Swal.fire("Success", "Berhasil dihapus", "success");
      fetchCategories();
    } catch (error) {
      Swal.fire("Error", "Gagal hapus", "error");
    }
  };

  return (
    <div className="flex min-h-screen bg-linear-to-br from-orange-50 via-white to-amber-50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <section
          ref={headerRef}
          className="mb-8 rounded-2xl bg-linear-to-r from-orange-500 via-orange-500 to-amber-500 px-6 py-7 text-white shadow-lg"
        >
          <h1 className="text-3xl font-bold md:text-4xl">Category</h1>
          <p className="mt-2 text-sm text-orange-50 md:text-base">
            Kelola kategori produk agar katalog tetap rapi dan terstruktur.
          </p>
        </section>

        <div
          ref={cardRef}
          className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm"
        >
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold text-slate-800">
              Category List
            </h2>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={fetchCategories}
                className="rounded-lg border border-orange-200 px-4 py-2 text-sm font-medium text-orange-600 transition hover:bg-orange-50"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={handleAdd}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-600"
              >
                + Tambah Category
              </button>
            </div>
          </div>

          {errorMessage ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {errorMessage}
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded-xl border border-orange-100 px-4 py-10 text-center text-sm text-slate-500">
              Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div className="rounded-xl border border-orange-100 px-4 py-10 text-center text-sm text-slate-500">
              Data kategori masih kosong.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {categories.map((item, index) => (
                  <div
                    key={item.id}
                    ref={(element) => {
                      mobileCardsRef.current[index] = element;
                    }}
                    className="rounded-xl border border-orange-100 p-3 shadow-xs"
                  >
                    <p className="text-xs text-slate-500">No. {index + 1}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {item.name}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        className="rounded-md bg-amber-500 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-amber-600"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="rounded-md bg-red-500 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div ref={tableRef} className="hidden overflow-x-auto md:block">
                <table className="min-w-full overflow-hidden rounded-xl">
                  <thead className="bg-orange-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        No
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Nama
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((item, index) => (
                      <tr
                        key={item.id}
                        className="border-b border-orange-50 last:border-0"
                      >
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">
                          {item.name}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(item)}
                              className="rounded-md bg-amber-500 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-amber-600"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              className="rounded-md bg-red-500 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-slate-800">
              {isEdit ? "Edit Category" : "Tambah Category"}
            </h2>

            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Nama category"
              className="mb-4 w-full rounded-lg border border-orange-100 px-3 py-2 outline-none focus:border-orange-300"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-orange-200 px-4 py-2 text-sm text-slate-700 transition hover:bg-orange-50"
              >
                Batal
              </button>

              <button
                onClick={handleSubmit}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-600"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
