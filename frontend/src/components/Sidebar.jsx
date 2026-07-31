import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLibrary } from "../context/LibraryContext.jsx";

/**
 * Left vertical navigation rail.
 *
 * Liked and Watchlist show live counts pulled from LibraryContext, so the
 * badges update the moment a card is toggled anywhere in the app.
 * Hidden on small screens where the top navbar carries navigation instead.
 */
export default function Sidebar() {
  const location = useLocation();
  const { isLoggedIn } = useAuth();
  const { likedCount, watchlistCount } = useLibrary();

  const items = [
    { to: "/",          icon: "⊙",  label: "Explore",   badge: null },
    { to: "/liked",     icon: "♥",  label: "Liked",     badge: likedCount,     authOnly: true },
    { to: "/watchlist", icon: "🔖", label: "Watchlist", badge: watchlistCount, authOnly: true },
  ];

  return (
    <aside
      className="hidden md:flex flex-col w-[68px] lg:w-52 flex-shrink-0 border-r border-white/5
                 bg-[#0b0b0b] py-4 sticky top-0 h-screen"
    >
      <nav className="flex flex-col gap-1 px-2 lg:px-3">
        {items.map(({ to, icon, label, badge, authOnly }) => {
          if (authOnly && !isLoggedIn) return null;

          const active = location.pathname === to;

          return (
            <Link
              key={to}
              to={to}
              title={label}
              aria-current={active ? "page" : undefined}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 no-underline
                          transition-all duration-200
                          ${active
                            ? "bg-violet-600/15 text-white"
                            : "text-white/45 hover:text-white hover:bg-white/5"
                          }`}
            >
              {/* Active indicator bar */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full bg-violet-500" />
              )}

              <span className="text-base leading-none flex-shrink-0 w-5 text-center">{icon}</span>

              <span className="hidden lg:block text-sm font-medium flex-1 truncate">{label}</span>

              {badge > 0 && (
                <span
                  className={`hidden lg:flex items-center justify-center min-w-[20px] h-5 px-1.5
                              rounded-full text-[10px] font-bold
                              ${active
                                ? "bg-violet-500 text-white"
                                : "bg-white/10 text-white/60 group-hover:bg-white/15"
                              }`}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapsed-rail count dots (only visible on the md breakpoint) */}
      <div className="lg:hidden flex flex-col items-center gap-2 mt-2">
        {isLoggedIn && likedCount > 0 && (
          <span className="text-[9px] font-bold text-rose-400">{likedCount}♥</span>
        )}
      </div>
    </aside>
  );
}
