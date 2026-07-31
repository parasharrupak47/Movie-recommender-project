import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../services/api.js";
import Navbar from "../components/Navbar.jsx";
import Sidebar from "../components/Sidebar.jsx";
import MovieCard from "../components/MovieCard.jsx";
import { useLibrary } from "../context/LibraryContext.jsx";

/**
 * Renders one saved-movie collection (watchlist or likes).
 *
 * Entries are fetched from the database on mount, then re-fetched whenever the
 * in-memory id set for this collection changes size — that way toggling a card
 * from this page (or any other) keeps the grid in sync without a manual reload.
 *
 * @param {"watchlist"|"likes"} collection - API path segment and response key
 * @param {string} title    - page heading
 * @param {string} icon     - emoji shown beside the heading
 * @param {string} emptyMsg - copy shown when the collection is empty
 */
export default function CollectionPage({ collection, title, icon, emptyMsg }) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const { likedIds, watchlistIds, removeFrom } = useLibrary();

  // Re-fetch when this collection's size changes (a card was toggled somewhere)
  const trackedSize = collection === "likes" ? likedIds.size : watchlistIds.size;

  const load = useCallback(async () => {
    try {
      setError("");
      const { data } = await api.get(`/api/user/${collection}`);
      setItems(data[collection] ?? []);
    } catch {
      setError("Couldn't load this collection. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [collection]);

  useEffect(() => { load(); }, [load, trackedSize]);

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
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <h1 className="text-2xl font-black flex items-center gap-2">
                <span>{icon}</span> {title}
              </h1>
              <p className="text-sm text-white/35 mt-1">
                {loading
                  ? "Loading…"
                  : `${items.length} ${items.length === 1 ? "movie" : "movies"} saved`}
              </p>
            </div>
            <Link
              to="/"
              className="text-xs text-violet-400 hover:text-violet-300 font-medium no-underline transition-colors"
            >
              ← Back to Explore
            </Link>
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-8 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
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
              <button onClick={load} className="underline hover:no-underline font-medium">
                Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="text-5xl mb-4 opacity-30">{icon}</span>
              <h2 className="text-lg font-bold text-white mb-1">Nothing here yet</h2>
              <p className="text-sm text-white/35 max-w-xs mb-6">{emptyMsg}</p>
              <Link
                to="/"
                className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold
                           px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-violet-500/20 no-underline"
              >
                Browse movies →
              </Link>
            </div>
          )}

          {/* Grid */}
          {!loading && !error && items.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-8 gap-3">
              {items.map((item) => (
                <div key={item.movieId} className="relative group/wrap">
                  <MovieCard
                    movie={{
                      id:     item.movieId,
                      title:  item.title,
                      img:    item.poster,
                      rating: item.rating,
                    }}
                  />

                  {/* Quick remove — appears on hover */}
                  <button
                    onClick={() => removeFrom(collection, item.movieId)}
                    aria-label={`Remove ${item.title}`}
                    title="Remove"
                    className="absolute -top-1.5 -left-1.5 w-6 h-6 flex items-center justify-center
                               rounded-full bg-red-500 text-white text-xs font-bold
                               opacity-0 group-hover/wrap:opacity-100 transition-opacity duration-200
                               shadow-lg hover:bg-red-400 active:scale-90 z-10"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
