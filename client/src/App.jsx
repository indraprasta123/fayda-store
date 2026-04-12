import Login from "./views/Login";
import { Route, Routes } from "react-router-dom";
import Home from "./views/Home";
import AuthLayout from "./layouts/AuthLayout";
import MainLayout from "./layouts/MainLayout";
import Register from "./views/Register";
import Logout from "./views/Logout";
import Checkout from "./views/Checkout";
import ConfirmDelivery from "./views/ConfirmDelivery";
import Payment from "./views/Payment";
import PaymentSuccess from "./views/PaymentSuccess";
import RiwayatPesanan from "./views/RiwayatPesanan";
import Profile from "./views/Profile";
import Produk from "./views/Produk";
import DetailProduct from "./views/DetailProduct";

function App() {
  return (
    <Routes>
      <Route path="/logout" element={<Logout />} />
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/produk" element={<Produk />} />
        <Route path="/produk/:id" element={<DetailProduct />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/confirm-delivery" element={<ConfirmDelivery />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/riwayat-pesanan" element={<RiwayatPesanan />} />
      </Route>
    </Routes>
  );
}
export default App;
