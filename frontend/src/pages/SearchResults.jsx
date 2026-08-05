import { useEffect, useState, useCallback } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import api from "../services/api.js";
import Navbar from "../components/Navbar.jsx";
import Sidebar from "../components/Sidebar.jsx";
import MovieCard from "../components/MovieCard.jsx";
import RecommendationRow from "../components/RecommendationRow.jsx";

/**
 * Full results grid for a search term, driven by the `?q=` query parameter.
 * Reached by pressing Enter or picking a suggestion in the SearchBar.
 *
 * The top hit seeds an ML-powered "More Like This" row below the results.
 */
export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = (searchParams.get("q") ?? "").trim();

  const [results, setResults] = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const load = useCallback(async (signal) => {
    if (!query) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data } = await api.get("/api/recommend/search", {
        params: { q: query },
        signal,
      });
      setResults(data.results ?? []);
      setTotal(data.totalResults ?? 0);
    } catch (err) {
      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
      setError("Couldn't run that search. Please try again.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main
          className="flex-1 overflow-y-auto px-6 py-6"
          style={{ background: "radial-gradient(ellipse 60% 40% at 10% 0%, rgba(109,40,217,0.1) 0%, transparent 70%)" }}
        >
          {/* Header */}
          <div className="flex items-baseline justify-between mb-6 gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-black flex items-center gap-2">
                <span>🔍</span>
                <span className="truncate">
                  {query ? `Results for “${query}”` : "Search"}
                </span>
              </h1>
              <p className="text-sm text-white/35 mt-1">
                {loading
                  ? "Searching…"
                  : query
                    ? `${total.toLocaleString()} ${total === 1 ? "match" : "matches"} found`
                    : "Type in the search bar above to find a movie."}
              </p>
            </div>
            <Link
              to="/"
              className="text-xs text-violet-400 hover:text-violet-300 font-medium no-underline transition-colors whitespace-nowrap"
            >
              ← Back to Explore
            </Link>
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-8 gap-3">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden bg-white/5 animate-pulse">
                  <div className="aspect-[3/4] bg-white/5" />
                  <div className="p-2 space-y-2">
                    <div className="h-2 w-10 bg-white/10 rounded" />
                    <div className="h-2 w-full bg-white/10 rounded" />
                    <div className="h-6 w-full bg-white/10 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
              {error}{" "}
              <button
                onClick={() => load()}
                className="underline hover:no-underline font-medium"
              >
                Retry
              </button>
            </div>
          )}

          {/* No matches */}
          {!loading && !error && query && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="text-5xl mb-4 opacity-30">🔍</span>
              <h2 className="text-lg font-bold text-white mb-1">No movies found</h2>
              <p className="text-sm text-white/35 max-w-xs">
                Nothing matched “{query}”. Try a different title or check the spelling.
              </p>
            </div>
          )}

          {/* Results */}
          {!loading && !error && results.length > 0 && (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-8 gap-3">
                {results.map((movie) => (
                  <MovieCard
                    key={movie.movie_id}
                    movie={{
                      id:     movie.movie_id,
                      title:  movie.title,
                      img:    movie.poster,
                      rating: movie.rating,
                    }}
                    onClick={(m) => navigate(`/movie/${m.id}`)}
                  />
                ))}
              </div>

              {/* ML recommendations seeded by the closest match to the query */}
              <RecommendationRow seedMovie={results[0]} topN={5} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
