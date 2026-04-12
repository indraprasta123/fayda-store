import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useSettings } from "../context/SettingsContext";
import Footer from "../components/Footer";
import socket from "../utils/socket";
export default function MainLayout() {
  const { theme } = useSettings();
  const token = localStorage.getItem("access_token");

  useEffect(() => {
    if (!token) return;

    const handleConnect = () => {
      socket.emit("join-user-room", token);
    };

    socket.on("connect", handleConnect);

    if (!socket.connected) {
      socket.connect();
    } else {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.disconnect();
    };
  }, [token]);

  if (!token) {
    return <Navigate to="/login" />;
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-slate-50"
      }`}
    >
      <Navbar />
      <Outlet />
      <Footer />
    </div>
  );
}
