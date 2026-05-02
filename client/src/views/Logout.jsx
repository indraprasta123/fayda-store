import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useSettings } from "../context/SettingsContext";
import { logout as logoutAction } from "../store/authSlice";

export default function Logout() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { resetThemeToLight } = useSettings();

  useEffect(() => {
    dispatch(logoutAction());
    resetThemeToLight();
    navigate("/login", { replace: true });
  }, [dispatch, navigate, resetThemeToLight]);

  return null;
}
