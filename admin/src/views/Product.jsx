import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import Sidebar from "../components/Sidebar";
import api from "../api/axios";

export default function Product() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceSort, setPriceSort] = useState("default");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [modalType, setModalType] = useState(""); // 'add' | 'edit' | 'detail'
  const [currentProduct, setCurrentProduct] = useState(null);
  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    stock: "",
    description: "",
    image: "",
  });
  const [imageFile, setImageFile] = useState(null);

  const categoryOptions = useMemo(() => {
    const categoryNames = categories
      .map((category) => category?.name)
      .filter(Boolean);

    return [...new Set(categoryNames)].sort((a, b) => a.localeCompare(b));
  }, [categories]);

  const filteredAndSortedProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filteredProducts = products.filter((product) => {
      const nameMatches =
        !normalizedSearch ||
        (product.name || "").toLowerCase().includes(normalizedSearch);
      const categoryName = product.category?.name || "";
      const categoryMatches =
        selectedCategory === "all" || categoryName === selectedCategory;

      return nameMatches && categoryMatches;
    });

    const sortedProducts = [...filteredProducts];

    if (priceSort === "lowToHigh") {
      sortedProducts.sort(
        (a, b) => Number(a.price || 0) - Number(b.price || 0),
      );
    }

    if (priceSort === "highToLow") {
      sortedProducts.sort(
        (a, b) => Number(b.price || 0) - Number(a.price || 0),
      );
    }

    if (priceSort === "ratingHighToLow") {
      sortedProducts.sort((a, b) => {
        const ratingDiff =
          Number(b.averageRating || 0) - Number(a.averageRating || 0);

        if (ratingDiff !== 0) return ratingDiff;

        return Number(b.totalRatings || 0) - Number(a.totalRatings || 0);
      });
    }

    return sortedProducts;
  }, [products, searchTerm, selectedCategory, priceSort]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSortedProducts.length / itemsPerPage),
  );

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    return filteredAndSortedProducts.slice(startIndex, endIndex);
  }, [filteredAndSortedProducts, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, priceSort]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const { data } = await api.get("/admin/products");
      const productData = Array.isArray(data?.products) ? data.products : [];
      setProducts(productData);
    } catch (error) {
      const message =
        error?.response?.data?.message || "Gagal mengambil data produk";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await api.get("/admin/categories");
      const categoryData = Array.isArray(data?.categories)
        ? data.categories
        : Array.isArray(data)
          ? data
          : [];

      setCategories(categoryData);
    } catch {
      setCategories([]);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setForm((prev) => ({ ...prev, image: URL.createObjectURL(file) }));
  };

  const openModal = (type, product = null) => {
    setModalType(type);
    setCurrentProduct(product);
    if (product) {
      setImageFile(null);
      setForm({
        name: product.name || "",
        category: product.category?.name || product.category || "",
        price: product.price || "",
        stock: product.stock || "",
        description: product.description || "",
        image: product.image || "",
      });
    } else
      setForm({
        name: "",
        category: "",
        price: "",
        stock: "",
        description: "",
        image: "",
      });
    setImageFile(null);
  };

  const closeModal = () => {
    setModalType("");
    setCurrentProduct(null);
    setImageFile(null);
  };

  const addProduct = async () => {
    try {
      const payload = new FormData();
      payload.append("name", form.name);
      payload.append("category", form.category);
      payload.append("description", form.description);
      payload.append("price", String(Number(form.price)));
      payload.append("stock", String(Number(form.stock)));
      if (imageFile) payload.append("image", imageFile);

      await api.post("/admin/products", payload);

      await fetchProducts();
      closeModal();
      Swal.fire("Success", "Product added successfully", "success");
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to add product";
      Swal.fire("Error", message, "error");
    }
  };

  const editProduct = async () => {
    try {
      const payload = new FormData();
      payload.append("name", form.name);
      payload.append("category", form.category);
      payload.append("description", form.description);
      payload.append("price", String(Number(form.price)));
      payload.append("stock", String(Number(form.stock)));
      payload.append("image", form.image || "");
      if (imageFile) payload.append("image", imageFile);

      await api.patch(`/admin/products/${currentProduct.id}`, payload);

      await fetchProducts();
      closeModal();
      Swal.fire("Success", "Product updated successfully", "success");
    } catch (error) {
      const message =
        error?.response?.data?.message || "Failed to update product";
      Swal.fire("Error", message, "error");
    }
  };

  const deleteProduct = (product) => {
    if (Number(product?.stock) > 0) {
      Swal.fire(
        "Tidak bisa dihapus",
        `Data tidak bisa dihapus, stok produk ${product?.name || "ini"} harus 0`,
        "warning",
      );
      return;
    }

    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        api
          .delete(`/admin/products/${product.id}`)
          .then(() => {
            fetchProducts();
            Swal.fire("Deleted!", "Product has been deleted.", "success");
          })
          .catch((error) => {
            const message =
              error?.response?.data?.message || "Failed to delete product";
            Swal.fire("Error", message, "error");
          });
      }
    });
  };

  return (
    <div className="flex min-h-screen bg-linear-to-br from-orange-50 via-white to-amber-50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <section className="mb-8 rounded-2xl bg-linear-to-r from-orange-500 via-orange-500 to-amber-500 px-6 py-7 text-white shadow-lg">
          <h1 className="text-3xl font-bold md:text-4xl">Products</h1>
          <p className="mt-2 text-sm text-orange-50 md:text-base">
            Kelola katalog produk toko dari satu halaman.
          </p>
        </section>

        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-semibold text-slate-800">
              Product List
            </h2>
            <div className="flex items-center gap-2 self-end md:self-auto">
              <button
                onClick={fetchProducts}
                className="rounded-lg border border-orange-200 px-4 py-2 text-sm font-medium text-orange-600 transition hover:bg-orange-50"
              >
                Refresh
              </button>
              <button
                onClick={() => openModal("add")}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-600"
              >
                Add Product
              </button>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search product name..."
              className="w-full rounded-lg border border-orange-100 px-3 py-2 text-sm outline-none focus:border-orange-300"
            />

            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="w-full rounded-lg border border-orange-100 px-3 py-2 text-sm outline-none focus:border-orange-300"
            >
              <option value="all">All Categories</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              value={priceSort}
              onChange={(event) => setPriceSort(event.target.value)}
              className="w-full rounded-lg border border-orange-100 px-3 py-2 text-sm outline-none focus:border-orange-300"
            >
              <option value="default">Sort by Price</option>
              <option value="lowToHigh">Price: Low to High</option>
              <option value="highToLow">Price: High to Low</option>
              <option value="ratingHighToLow">Rating: High to Low</option>
            </select>
          </div>

          {errorMessage ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {errorMessage}
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded-xl border border-orange-100 px-4 py-10 text-center text-sm text-slate-500">
              Loading products...
            </div>
          ) : filteredAndSortedProducts.length === 0 ? (
            <div className="rounded-xl border border-orange-100 px-4 py-10 text-center text-sm text-slate-500">
              Tidak ada produk yang sesuai filter.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {paginatedProducts.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-orange-100 p-3 shadow-xs"
                  >
                    <div className="mb-3 flex items-start gap-3">
                      <img
                        src={p.image}
                        alt={p.name}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {p.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {p.category?.name || "-"}
                        </p>
                        <p className="mt-1 text-sm font-bold text-orange-600">
                          Rp {Number(p.price || 0).toLocaleString("id-ID")}
                        </p>
                        <p className="text-xs text-slate-500">
                          ⭐ {Number(p.averageRating || 0).toFixed(1)} (
                          {Number(p.totalRatings || 0)})
                        </p>
                        <p className="text-xs text-slate-500">
                          Stock: {p.stock}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openModal("detail", p)}
                        className="rounded-md bg-slate-500 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-slate-600"
                      >
                        Detail
                      </button>
                      <button
                        onClick={() => openModal("edit", p)}
                        className="rounded-md bg-amber-500 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-amber-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteProduct(p)}
                        className="rounded-md bg-red-500 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full overflow-hidden rounded-xl">
                  <thead className="bg-orange-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Image
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Price
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Rating
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Stock
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-orange-50 last:border-0"
                      >
                        <td className="px-4 py-3">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="h-14 w-14 rounded-lg object-cover"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {p.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {p.category?.name || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                          Rp {Number(p.price || 0).toLocaleString("id-ID")}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          ⭐ {Number(p.averageRating || 0).toFixed(1)} (
                          {Number(p.totalRatings || 0)})
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {p.stock}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => openModal("detail", p)}
                              className="rounded-md bg-slate-500 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-slate-600"
                            >
                              Detail
                            </button>
                            <button
                              onClick={() => openModal("edit", p)}
                              className="rounded-md bg-amber-500 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-amber-600"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteProduct(p)}
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

              <div className="mt-4 flex flex-col gap-3 border-t border-orange-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1} -{" "}
                  {Math.min(
                    currentPage * itemsPerPage,
                    filteredAndSortedProducts.length,
                  )}{" "}
                  of {filteredAndSortedProducts.length} products
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="rounded-lg border border-orange-200 px-3 py-1.5 text-xs font-medium text-orange-600 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span className="text-xs font-medium text-slate-600">
                    Page {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-orange-200 px-3 py-1.5 text-xs font-medium text-orange-600 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {modalType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <button
                onClick={closeModal}
                className="absolute right-3 top-3 text-xl text-slate-500 transition hover:text-slate-700"
              >
                &times;
              </button>

              {modalType === "detail" ? (
                <>
                  <h2 className="mb-4 text-xl font-bold text-slate-800">
                    Product Detail
                  </h2>
                  <img
                    src={currentProduct.image}
                    alt={currentProduct.name}
                    className="mb-4 h-48 w-full rounded-lg object-cover"
                  />
                  <p className="text-sm text-slate-700">
                    <strong>Name:</strong> {currentProduct.name}
                  </p>
                  <p className="text-sm text-slate-700">
                    <strong>Category:</strong>{" "}
                    {currentProduct.category?.name || "-"}
                  </p>
                  <p className="text-sm text-slate-700">
                    <strong>Price:</strong> Rp {currentProduct.price}
                  </p>
                  <p className="text-sm text-slate-700">
                    <strong>Rating:</strong> ⭐{" "}
                    {Number(currentProduct.averageRating || 0).toFixed(1)} (
                    {Number(currentProduct.totalRatings || 0)} rating)
                  </p>
                  <p className="text-sm text-slate-700">
                    <strong>Stock:</strong> {currentProduct.stock}
                  </p>
                  <p className="text-sm text-slate-700">
                    <strong>Description:</strong> {currentProduct.description}
                  </p>
                </>
              ) : (
                <>
                  <h2 className="mb-4 text-xl font-bold text-slate-800">
                    {modalType === "add" ? "Add Product" : "Edit Product"}
                  </h2>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      modalType === "add" ? addProduct() : editProduct();
                    }}
                    className="space-y-3"
                  >
                    <div>
                      <label
                        htmlFor="name"
                        className="mb-1 block text-sm font-medium text-slate-700"
                      >
                        Name
                      </label>
                      <input
                        id="name"
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-orange-100 px-3 py-2 outline-none focus:border-orange-300"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="category"
                        className="mb-1 block text-sm font-medium text-slate-700"
                      >
                        Category
                      </label>
                      <select
                        id="category"
                        name="category"
                        value={form.category}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-orange-100 px-3 py-2 outline-none focus:border-orange-300"
                      >
                        <option value="">Pilih category</option>
                        {categoryOptions.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="price"
                        className="mb-1 block text-sm font-medium text-slate-700"
                      >
                        Price
                      </label>
                      <input
                        id="price"
                        type="number"
                        name="price"
                        value={form.price}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-orange-100 px-3 py-2 outline-none focus:border-orange-300"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="stock"
                        className="mb-1 block text-sm font-medium text-slate-700"
                      >
                        Stock
                      </label>
                      <input
                        id="stock"
                        type="number"
                        name="stock"
                        value={form.stock}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-orange-100 px-3 py-2 outline-none focus:border-orange-300"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="image"
                        className="mb-1 block text-sm font-medium text-slate-700"
                      >
                        Image
                      </label>
                      <input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="w-full rounded-lg border border-orange-100 px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-orange-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-orange-700"
                      />
                      {form.image ? (
                        <img
                          src={form.image}
                          alt="Preview"
                          className="mt-2 h-20 w-20 rounded-md object-cover"
                        />
                      ) : null}
                    </div>
                    <div>
                      <label
                        htmlFor="description"
                        className="mb-1 block text-sm font-medium text-slate-700"
                      >
                        Description
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-orange-100 px-3 py-2 outline-none focus:border-orange-300"
                      ></textarea>
                    </div>
                    <button
                      type="submit"
                      className="w-full rounded-lg bg-orange-500 py-2 text-sm font-medium text-white transition hover:bg-orange-600"
                    >
                      {modalType === "add" ? "Add" : "Update"}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
