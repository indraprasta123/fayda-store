import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";

export default function Logout() {
  const navigate = useNavigate();
  const { resetThemeToLight } = useSettings();

  useEffect(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_role");
    resetThemeToLight();
    navigate("/login", { replace: true });
  }, [navigate, resetThemeToLight]);

  return null;
}
