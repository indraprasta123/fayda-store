import { useEffect } from "react";

export default function Login() {
  const clientLoginUrl =
    import.meta.env.VITE_CLIENT_LOGIN_URL || "http://localhost:5173/login";

  useEffect(() => {
    window.location.replace(clientLoginUrl);
  }, [clientLoginUrl]);

  return null;
}
