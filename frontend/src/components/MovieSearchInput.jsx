import { useState, useEffect, useRef } from "react";
import useDebounce from "../hooks/useDebounce.js";
import api from "../services/api.js";

/**
 * Search input with debounced dropdown suggestions.
 * 
 * @param {Object} props
 * @param {function} props.onMovieSelect - Callback when a movie is selected
 * @param {string} props.placeholder - Input placeholder text
 */
export default function MovieSearchInput({ onMovieSelect, placeholder = "Search for a movie..." }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  
  const debouncedQuery = useDebounce(query, 300);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions when debounced query changes
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    api
      .get("/api/recommend/search", {
        params: { q: debouncedQuery, page: 1 },
        signal: controller.signal,
      })
      .then(({ data }) => {
        setSuggestions(data.results || []);
        setShowDropdown(true);
      })
      .catch((err) => {
        if (err.name !== "CanceledError" && err.code !== "ERR_CANCELED") {
          console.error("Search error:", err);
          setSuggestions([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [debouncedQuery]);

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    setSelectedMovie(null);
  };

  const handleSelectMovie = (movie) => {
    setQuery(movie.title);
    setSelectedMovie(movie);
    setShowDropdown(false);
    setSuggestions([]);
    onMovieSelect(movie);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowDropdown(true);
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Dropdown suggestions */}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl max-h-80 overflow-y-auto">
          {suggestions.slice(0, 8).map((movie) => (
            <button
              key={movie.id}
              onClick={() => handleSelectMovie(movie)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0 text-left"
            >
              {movie.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                  alt={movie.title}
                  className="w-10 h-14 object-cover rounded"
                />
              ) : (
                <div className="w-10 h-14 bg-white/5 rounded flex items-center justify-center text-white/20 text-xs">
                  No Image
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{movie.title}</p>
                <p className="text-white/40 text-xs">
                  {movie.release_date ? new Date(movie.release_date).getFullYear() : "N/A"}
                  {movie.vote_average > 0 && (
                    <span className="ml-2">
                      ⭐ {movie.vote_average.toFixed(1)}
                    </span>
                  )}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showDropdown && !loading && debouncedQuery.length >= 2 && suggestions.length === 0 && (
        <div className="absolute z-50 w-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl p-4 text-center text-white/40 text-sm">
          No movies found for "{debouncedQuery}"
        </div>
      )}
    </div>
  );
}
