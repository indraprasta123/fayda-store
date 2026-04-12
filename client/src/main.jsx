import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { store } from "./store";
import { SettingsProvider } from "./context/SettingsContext";

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
