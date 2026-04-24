import { Navigate } from "react-router-dom";
import { useEffect } from "react";

export default function AuthLayout() {
  const token = localStorage.getItem("access_token");
  const role = localStorage.getItem("user_role");
  const clientLoginUrl =
    import.meta.env.VITE_CLIENT_LOGIN_URL || "https://faydaa.store/login";

  if (token && role === "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  if (token && role && role !== "admin") {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_role");
  }

  useEffect(() => {
    window.location.replace(clientLoginUrl);
  }, [clientLoginUrl]);

  return null;
}
