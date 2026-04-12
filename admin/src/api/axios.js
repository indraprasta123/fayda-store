import axios from "axios";
import { url } from "../constant/Url";

const api = axios.create({
  baseURL: url,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
