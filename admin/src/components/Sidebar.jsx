import { NavLink, useLocation } from "react-router-dom";
import { animate } from "animejs";
import { useEffect, useRef, useState } from "react";

const getInitialIsMobile = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
};

export default function Sidebar() {
  const location = useLocation();
  const clientLogoutUrl =
    import.meta.env.VITE_CLIENT_LOGOUT_URL || "https://faydaa.store/logout";
  const [isMobile, setIsMobile] = useState(getInitialIsMobile);
  const [isOpen, setIsOpen] = useState(() => !getInitialIsMobile());
  const sidebarRef = useRef(null);
  const menuRefs = useRef([]);

  const menuItems = [
    { name: "Dashboard", path: "/dashboard", short: "D" },
    { name: "Users", path: "/data-user", short: "U" },
    { name: "Products", path: "/product", short: "P" },
    { name: "Category", path: "/category", short: "C" },
    { name: "Orders", path: "/orders", short: "O" },
    { name: "Payments", path: "/payments", short: "Y" },
    { name: "Recap Report", path: "/recap-report", short: "R" },
  ];

  useEffect(() => {
    if (!sidebarRef.current) return;

    const sidebarAnimation = animate(sidebarRef.current, {
      opacity: [0, 1],
      x: [-20, 0],
      duration: 900,
      easing: "outExpo",
    });

    const itemAnimation = animate(menuRefs.current.filter(Boolean), {
      opacity: [0, 1],
      x: [-14, 0],
      delay: (_, index) => 220 + index * 90,
      duration: 700,
      easing: "outExpo",
    });

    return () => {
      sidebarAnimation.pause();
      itemAnimation.pause();
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");

    const handleMediaChange = (event) => {
      setIsMobile(event.matches);
      setIsOpen(!event.matches);
    };

    setIsMobile(mediaQuery.matches);
    setIsOpen(!mediaQuery.matches);
    mediaQuery.addEventListener("change", handleMediaChange);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, []);

  useEffect(() => {
    if (!sidebarRef.current) return;

    if (isMobile) return;

    const widthAnimation = animate(sidebarRef.current, {
      width: isOpen ? 280 : 92,
      duration: 500,
      easing: "outCubic",
    });

    return () => {
      widthAnimation.pause();
    };
  }, [isOpen, isMobile]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_role");
    window.location.assign(clientLogoutUrl);
  };

  const isCurrentPath = (path) =>
    location.pathname === path ||
    (path === "/dashboard" && location.pathname === "/");

  return (
    <div
      ref={sidebarRef}
      style={{
        width: isMobile
          ? isOpen
            ? "100%"
            : "clamp(72px, 25vw, 110px)"
          : isOpen
            ? 280
            : 92,
      }}
      className="sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden border-r border-orange-300/40 bg-gradient-to-b from-orange-500 via-orange-500 to-orange-600 text-white shadow-xl"
    >
      <div className="flex gap-1 items-center justify-between border-b border-white/20 px-4 py-4">
        {isOpen ? (
          <div>
            <p className="text-lg font-bold leading-tight">Fayda Admin</p>
            <p className="text-xs text-orange-100">Control Center</p>
          </div>
        ) : (
          <span className="mx-auto rounded-lg bg-white/25 px-2 py-1 text-sm font-semibold">
            FA
          </span>
        )}

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-lg border border-white/30 bg-white/10 p-1.5 text-white transition hover:bg-white/20"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 transition-transform duration-300 ${isOpen ? "rotate-0" : "rotate-180"}`}
          >
            <path
              d="M15 6L9 12L15 18"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-5">
        {menuItems.map((item, index) => (
          <NavLink
            key={item.name}
            to={item.path}
            onClick={() => {
              if (isMobile) setIsOpen(false);
            }}
            ref={(element) => {
              menuRefs.current[index] = element;
            }}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              isCurrentPath(item.path)
                ? "bg-white text-orange-600 shadow"
                : "text-orange-50/95 hover:bg-white/20"
            }`}
          >
            <span
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold ${
                isCurrentPath(item.path)
                  ? "bg-orange-100 text-orange-600"
                  : "bg-white/20 text-white"
              }`}
            >
              {item.short}
            </span>
            {isOpen ? <span>{item.name}</span> : null}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/20 px-3 py-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl border border-white/30 bg-white/10 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-xs font-semibold">
            ⎋
          </span>
          {isOpen ? "Logout" : null}
        </button>

        {isOpen ? (
          <p className="mt-3 text-center text-xs text-orange-100">
            © 2026 Fayda Store
          </p>
        ) : null}
      </div>
    </div>
  );
}
