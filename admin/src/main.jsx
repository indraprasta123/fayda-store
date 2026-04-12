import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { store } from "./store";
import { SettingsProvider } from "./context/SettingsContext";

const bootstrapAdminSession = () => {
  const currentUrl = new URL(window.location.href);
  const accessToken = currentUrl.searchParams.get("access_token");
  const role = currentUrl.searchParams.get("role");

  if (accessToken && role === "admin") {
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("user_role", role);

    currentUrl.searchParams.delete("access_token");
    currentUrl.searchParams.delete("role");

    if (currentUrl.pathname === "/" || currentUrl.pathname === "/login") {
      currentUrl.pathname = "/dashboard";
    }

    window.history.replaceState(
      {},
      "",
      `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`,
    );
  }
};

bootstrapAdminSession();

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <SettingsProvider>
        {googleClientId ? (
          <GoogleOAuthProvider clientId={googleClientId}>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </GoogleOAuthProvider>
        ) : (
          <BrowserRouter>
            <App />
          </BrowserRouter>
        )}
      </SettingsProvider>
    </Provider>
  </StrictMode>,
);
