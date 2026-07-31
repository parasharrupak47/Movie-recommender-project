import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api.js";
import { useDebounce } from "../hooks/useDebounce.js";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 400;
const MAX_SUGGESTIONS = 6;

const FALLBACK_THUMB =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='60' viewBox='0 0 40 60'%3E%3Crect width='40' height='60' fill='%231a1a2e'/%3E%3Ctext x='20' y='36' font-size='16' text-anchor='middle' fill='%23ffffff40'%3E🎬%3C/text%3E%3C/svg%3E";

function SearchIcon({ className = "" }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Debounced movie search with a live suggestion dropdown.
 *
 * Typing updates the input immediately but only fires a request once the user
 * pauses (see useDebounce). In-flight requests are aborted when a newer query
 * supersedes them, which prevents a slow early response from overwriting the
 * results of a later, faster one.
 *
 * Keyboard: ↑/↓ moves through suggestions, Enter opens the highlighted one
 * (or the full results page), Escape closes.
 */
export default function SearchBar({ className = "", autoFocus = false }) {
  const navigate = useNavigate();

  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState([]);
  const [open, setOpen]           = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  const wrapperRef = useRef(null);
  const inputRef   = useRef(null);
  const abortRef   = useRef(null);

  // Only the settled value triggers a request
  const debouncedQuery = useDebounce(query.trim(), DEBOUNCE_MS);

  const suggestions = useMemo(() => results.slice(0, MAX_SUGGESTIONS), [results]);

  // ── Fetch whenever the debounced query settles ──────────
  useEffect(() => {
    // Abort any request that's still in flight from a previous query
    abortRef.current?.abort();

    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      setError("");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError("");

    api
      .get("/api/recommend/search", {
        params: { q: debouncedQuery },
        signal: controller.signal,
      })
      .then(({ data }) => {
        setResults(data.results ?? []);
        setActiveIndex(-1);
      })
      .catch((err) => {
        // Aborts are expected while typing — not a real failure
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
        setResults([]);
        setError("Search is unavailable right now.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [debouncedQuery]);

  // ── Close on outside click ──────────────────────────────
  useEffect(() => {
    const onPointerDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const goToResults = (term) => {
    const q = (term ?? query).trim();
    if (q.length < MIN_QUERY_LENGTH) return;
    setOpen(false);
    inputRef.current?.blur();
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!suggestions.length) return;
      e.preventDefault();
      setOpen(true);
      setActiveIndex((prev) => {
        const delta = e.key === "ArrowDown" ? 1 : -1;
        const next = prev + delta;
        if (next < 0) return suggestions.length - 1;
        if (next >= suggestions.length) return 0;
        return next;
      });
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const picked = suggestions[activeIndex];
      goToResults(picked ? picked.title : undefined);
    }
  };

  const clear = () => {
    setQuery("");
    setResults([]);
    setError("");
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const showDropdown = open && query.trim().length >= MIN_QUERY_LENGTH;

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* ── Input ──────────────────────────────────────── */}
      <div
        className={`flex items-center gap-2 rounded-full border transition-all duration-200
                    ${open
                      ? "bg-white/8 border-violet-500/50 ring-1 ring-violet-500/30"
                      : "bg-white/5 border-white/10 hover:border-white/20"
                    }`}
      >
        <span className="pl-3 text-white/35 flex-shrink-0">
          <SearchIcon />
        </span>

        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="search-suggestions"
          aria-autocomplete="list"
          aria-label="Search movies"
          autoFocus={autoFocus}
          value={query}
          placeholder="Search movies…"
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 bg-transparent py-2 text-sm text-white placeholder-white/25
                     focus:outline-none"
        />

        {/* Spinner while a request is in flight */}
        {loading && (
          <span className="flex-shrink-0">
            <span className="block w-3.5 h-3.5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
          </span>
        )}

        {query && !loading && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full
                       text-white/35 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        )}

        <span className="pr-3" />
      </div>

      {/* ── Suggestions dropdown ───────────────────────── */}
      {showDropdown && (
        <div
          id="search-suggestions"
          role="listbox"
          className="absolute left-0 right-0 mt-2 bg-[#161616] border border-white/10 rounded-xl
                     shadow-2xl shadow-black/60 overflow-hidden z-50 animate-fade-in"
        >
          {/* Loading placeholder on first query */}
          {loading && suggestions.length === 0 && (
            <div className="p-3 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-9 h-12 rounded bg-white/8 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 w-2/3 bg-white/8 rounded" />
                    <div className="h-2 w-1/4 bg-white/8 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && !loading && (
            <p className="px-4 py-3 text-sm text-red-400">{error}</p>
          )}

          {!loading && !error && suggestions.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-white/50">No movies found</p>
              <p className="text-xs text-white/25 mt-1">
                Try a different title or spelling.
              </p>
            </div>
          )}

          {suggestions.length > 0 && (
            <>
              <ul className="max-h-[22rem] overflow-y-auto">
                {suggestions.map((movie, i) => (
                  <li key={movie.movie_id} role="option" aria-selected={i === activeIndex}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => goToResults(movie.title)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors
                                  ${i === activeIndex ? "bg-violet-600/15" : "hover:bg-white/5"}`}
                    >
                      <img
                        src={movie.poster || FALLBACK_THUMB}
                        alt=""
                        loading="lazy"
                        onError={(e) => {
                          if (e.target.src !== FALLBACK_THUMB) e.target.src = FALLBACK_THUMB;
                        }}
                        className="w-9 h-12 rounded object-cover bg-white/5 flex-shrink-0"
                      />

                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-white truncate">
                          {movie.title}
                        </span>
                        <span className="block text-[11px] text-white/35 mt-0.5">
                          {movie.year || "—"}
                          {movie.rating > 0 && (
                            <span className="text-amber-400/80 ml-2">
                              ★ {movie.rating.toFixed(1)}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => goToResults()}
                className="w-full px-4 py-2.5 text-xs font-semibold text-violet-400
                           hover:text-violet-300 hover:bg-white/5 border-t border-white/5
                           transition-colors text-left"
              >
                See all results for “{query.trim()}” →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
