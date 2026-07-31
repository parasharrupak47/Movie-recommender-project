import StarRating from "./StarRating.jsx";
import { useLibrary } from "../context/LibraryContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

// Inline SVG fallback — never triggers a network request
const FALLBACK_POSTER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450' viewBox='0 0 300 450'%3E%3Crect width='300' height='450' fill='%231a1a2e'/%3E%3Ctext x='150' y='230' font-size='48' text-anchor='middle' fill='%23ffffff40'%3E🎬%3C/text%3E%3C/svg%3E";

/** Heart icon — filled when liked, outline when not. */
function HeartIcon({ filled }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 21s-6.716-4.35-9.043-8.28C1.3 9.87 2.06 6.4 4.9 5.1c2.02-.92 4.22-.16 5.36 1.5L12 8.6l1.74-2c1.14-1.66 3.34-2.42 5.36-1.5 2.84 1.3 3.6 4.77 1.94 7.62C18.716 16.65 12 21 12 21z"
        fill={filled ? "#f43f5e" : "none"}
        stroke={filled ? "#f43f5e" : "rgba(255,255,255,0.85)"}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * Movie poster card.
 *
 * Liked / watchlist state comes from LibraryContext, which is backed by the
 * database — so it persists across refreshes and devices. Logged-out users
 * are routed to `onRequireAuth` instead of silently losing their click.
 *
 * @param {object}   movie         - { id, title, img, rating }
 * @param {Function} onRequireAuth - called when a logged-out user taps an action
 * @param {Function} onClick       - called with (movie) when the card is clicked
 */
export default function MovieCard({ movie, onRequireAuth, onClick }) {
  const { isLoggedIn } = useAuth();
  const { isLiked, isInWatchlist, isPending, toggleLike, toggleWatchlist } = useLibrary();

  const liked       = isLiked(movie.id);
  const inWatchlist = isInWatchlist(movie.id);
  const busy        = isPending(movie.id);
  const rating      = Number(movie.rating) || 0;

  const handleLike = (e) => {
    e.stopPropagation();                       // don't fire the card's onClick
    if (!isLoggedIn) return onRequireAuth?.();
    toggleLike(movie);
  };

  const handleWatchlist = (e) => {
    e.stopPropagation();
    if (!isLoggedIn) return onRequireAuth?.();
    toggleWatchlist(movie);
  };

  const handleImgError = (e) => {
    if (e.target.src !== FALLBACK_POSTER) e.target.src = FALLBACK_POSTER;
  };

  return (
    <div
      onClick={() => onClick?.(movie)}
      className="group relative flex flex-col rounded-xl overflow-hidden bg-[#161616] border border-white/8
                 shadow-md shadow-black/40 cursor-pointer
                 transition-all duration-300 ease-out
                 hover:-translate-y-1 hover:border-violet-500/40 hover:shadow-xl hover:shadow-violet-900/30"
    >
      {/* ── Upper half: poster ─────────────────────────── */}
      <div className="relative overflow-hidden aspect-[3/4] bg-white/5">
        <img
          src={movie.img || movie.poster}
          alt={movie.title}
          loading="lazy"
          onError={handleImgError}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />

        {/* Scrim keeps the heart legible on light posters */}
        <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

        {/* Heart toggle — top right */}
        <button
          onClick={handleLike}
          disabled={busy}
          aria-label={liked ? `Unlike ${movie.title}` : `Like ${movie.title}`}
          aria-pressed={liked}
          title={liked ? "Liked" : "Like this movie"}
          className={`absolute top-1.5 right-1.5 w-7 h-7 flex items-center justify-center rounded-full
                      backdrop-blur-md border transition-all duration-200
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400
                      active:scale-90 disabled:opacity-60
                      ${liked
                        ? "bg-rose-500/20 border-rose-400/50 scale-105"
                        : "bg-black/40 border-white/20 hover:bg-black/60 hover:border-white/40 hover:scale-110"
                      }`}
        >
          <HeartIcon filled={liked} />
        </button>

        {/* Bottom fade into the info panel */}
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#161616] to-transparent pointer-events-none" />
      </div>

      {/* ── Lower half: rating, title, action ──────────── */}
      <div className="flex flex-col gap-1 p-2 pt-1.5">
        <div className="flex items-center gap-1">
          <StarRating rating={rating} size={11} />
          <span className="text-[10px] font-bold text-amber-400 leading-none">
            {rating > 0 ? rating.toFixed(1) : "N/A"}
          </span>
          <span className="text-[9px] text-white/25 leading-none">/10</span>
        </div>

        <h3
          title={movie.title}
          className="text-xs font-semibold text-white leading-tight truncate
                     group-hover:text-violet-300 transition-colors duration-200"
        >
          {movie.title}
        </h3>

        <button
          onClick={handleWatchlist}
          disabled={busy}
          aria-pressed={inWatchlist}
          className={`w-full flex items-center justify-center gap-1 py-1.5 rounded-lg
                      text-[10px] font-semibold transition-all duration-200
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400
                      active:scale-[0.97] disabled:opacity-60
                      ${inWatchlist
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                        : "bg-violet-600 text-white border border-violet-500 hover:bg-violet-500 shadow shadow-violet-600/25"
                      }`}
        >
          {inWatchlist ? <CheckIcon /> : <PlusIcon />}
          {inWatchlist ? "In Watchlist" : "Watchlist"}
        </button>
      </div>
    </div>
  );
}
