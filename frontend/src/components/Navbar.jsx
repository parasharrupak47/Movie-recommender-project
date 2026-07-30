import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const NAV_ITEMS = [
  { id: "explore",   label: "Explore",   icon: "⊙",  path: "/" },
  { id: "watchlist", label: "Watchlist", icon: "🔖", path: "/watchlist" },
  { id: "alerts",    label: "Alerts",    icon: "🔔", path: "/alerts" },
];

// ── Avatar initials helper ───────────────────────────────
function getInitials(user) {
  if (!user) return "M";
  if (user.fullName) return user.fullName[0].toUpperCase();
  if (user.username) return user.username[0].toUpperCase();
  return "M";
}

export default function Navbar({ onRegisterClick }) {
  const { isLoggedIn, user, logout } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate("/");
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-[#0d0d0d]/95 backdrop-blur-sm sticky top-0 z-40">

      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 flex-shrink-0 no-underline">
        <span className="text-lg">🍹</span>
        <span className="text-sm font-bold tracking-wide text-white">MOVIE MOJITO</span>
      </Link>

      {/* Center nav */}
      <nav className="hidden md:flex items-center gap-1">
        {NAV_ITEMS.map((n) => {
          const active = location.pathname === n.path;
          return (
            <Link
              key={n.id}
              to={n.path}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all no-underline ${
                active
                  ? "text-white bg-white/8 font-medium"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              <span className="text-xs">{n.icon}</span>
              {n.label}
              {active && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <button className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors">
          🔍
        </button>

        {isLoggedIn ? (
          /* ── Logged-in state: avatar + dropdown ── */
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/8 transition-all"
            >
              {/* Avatar */}
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {user?.avatar
                  ? <img src={user.avatar} alt="avatar" className="w-full h-full rounded-full object-cover" />
                  : getInitials(user)
                }
              </div>
              <span className="text-xs font-medium text-white/80 hidden sm:block max-w-[80px] truncate">
                {user?.username || user?.fullName || "Account"}
              </span>
              <span className="text-white/30 text-xs">▾</span>
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-white/5">
                  <p className="text-sm font-semibold text-white truncate">{user?.fullName}</p>
                  <p className="text-xs text-white/40 truncate mt-0.5">@{user?.username}</p>
                </div>
                <div className="py-1">
                  <Link
                    to="/home"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors no-underline"
                  >
                    <span>🏠</span> Home
                  </Link>
                  <Link
                    to="/watchlist"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors no-underline"
                  >
                    <span>🔖</span> Watchlist
                  </Link>
                </div>
                <div className="border-t border-white/5 py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors"
                  >
                    <span>↩</span> Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Logged-out state: Login + Register ── */
          <>
            <Link
              to="/login"
              className="text-xs text-white/40 hover:text-white/70 transition-colors font-medium hidden sm:block no-underline"
            >
              Sign in
            </Link>
            <button
              onClick={onRegisterClick}
              className="text-xs bg-violet-600 hover:bg-violet-500 text-white font-semibold px-4 py-1.5 rounded-full transition-all shadow shadow-violet-500/20"
            >
              Register
            </button>
          </>
        )}
      </div>
    </header>
  );
}
