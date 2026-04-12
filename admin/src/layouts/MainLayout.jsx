import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import socket from "../utils/socket";
// import Footer from "../components/Footer";
export default function MainLayout() {
  const token = localStorage.getItem("access_token");
  const role = localStorage.getItem("user_role");

  useEffect(() => {
    if (!token || role !== "admin") return;

    const handleConnect = () => {
      socket.emit("join-admin-room", token);
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
  }, [token, role]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role !== "admin") {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_role");
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Outlet />
      {/* <Footer /> */}
    </>
  );
}
