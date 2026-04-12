import Login from "./views/Login";
import { Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "./views/Dashboard";
import Product from "./views/Product";
import MainLayout from "./layouts/MainLayout";
import DataUser from "./views/DataUser";
import Category from "./views/Category";
import Orders from "./views/Orders";
import Payments from "./views/Payments";
import RecapReport from "./views/RecapReport";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/product" element={<Product />} />
        <Route path="/data-user" element={<DataUser />} />
        <Route path="/category" element={<Category />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/recap-report" element={<RecapReport />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
export default App;
