import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import api from "../api/axios";

export default function DataUser() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const { data } = await api.get("/admin/users");
      const allUsers = Array.isArray(data?.users) ? data.users : [];
      setUsers(allUsers);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        "Gagal mengambil data user dari server";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const customerUsers = useMemo(
    () =>
      users.filter((user) => user.role === "user" || user.role === "customer"),
    [users],
  );

  const formatDate = (dateValue) => {
    if (!dateValue) return "-";

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  return (
    <div className="flex min-h-screen bg-linear-to-br from-orange-50 via-white to-amber-50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <section className="mb-8 rounded-2xl bg-linear-to-r from-orange-500 via-orange-500 to-amber-500 px-6 py-7 text-white shadow-lg">
          <h1 className="text-3xl font-bold md:text-4xl">Data User</h1>
          <p className="mt-2 text-sm text-orange-50 md:text-base">
            Menampilkan daftar customer yang mendaftar dari database.
          </p>
        </section>

        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-800">
              Customer List
            </h2>
            <button
              type="button"
              onClick={fetchUsers}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-600"
            >
              Refresh
            </button>
          </div>

          {errorMessage ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {errorMessage}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-full overflow-hidden rounded-xl">
              <thead className="bg-orange-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Registered
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-center text-sm text-slate-500"
                    >
                      Loading users...
                    </td>
                  </tr>
                ) : customerUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-center text-sm text-slate-500"
                    >
                      Belum ada data customer.
                    </td>
                  </tr>
                ) : (
                  customerUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-orange-50 last:border-0"
                    >
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {user.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {user.email || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          Customer
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {formatDate(user.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
