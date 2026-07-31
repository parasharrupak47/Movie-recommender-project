import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../services/api.js";
import { useAuth } from "./AuthContext.jsx";

const LibraryContext = createContext(null);

/**
 * Tracks which movies the current user has liked or added to their watchlist.
 *
 * The authoritative store is the database, so state survives refreshes and
 * follows the user across devices. Sets of ids are held in memory purely to
 * paint card states instantly; every toggle is persisted immediately and
 * rolled back if the request fails.
 */
export function LibraryProvider({ children }) {
  const { isLoggedIn, loading: authLoading } = useAuth();

  const [likedIds, setLikedIds]         = useState(() => new Set());
  const [watchlistIds, setWatchlistIds] = useState(() => new Set());
  const [loading, setLoading]           = useState(true);
  // Ids with an in-flight request, so buttons can show a pending state
  const [pending, setPending]           = useState(() => new Set());

  // ── Load the user's library once auth settles ───────────
  useEffect(() => {
    if (authLoading) return;

    if (!isLoggedIn) {
      // Logged out — clear everything so the next user starts clean
      setLikedIds(new Set());
      setWatchlistIds(new Set());
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    api
      .get("/api/user/library")
      .then(({ data }) => {
        if (cancelled) return;
        setLikedIds(new Set(data.likedIds ?? []));
        setWatchlistIds(new Set(data.watchlistIds ?? []));
      })
      .catch(() => {
        if (!cancelled) {
          setLikedIds(new Set());
          setWatchlistIds(new Set());
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isLoggedIn, authLoading]);

  const markPending = (id, isPending) =>
    setPending((prev) => {
      const next = new Set(prev);
      isPending ? next.add(id) : next.delete(id);
      return next;
    });

  /**
   * Shared toggle handler for both collections.
   * Applies the change optimistically, then reconciles with the server
   * response (or reverts if the request fails).
   */
  const toggle = useCallback(
    async (endpoint, setIds, movie) => {
      if (!isLoggedIn || !movie?.id) return false;

      const id = String(movie.id);
      let optimisticallyActive = false;

      setIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          optimisticallyActive = false;
        } else {
          next.add(id);
          optimisticallyActive = true;
        }
        return next;
      });

      markPending(id, true);

      try {
        const { data } = await api.post(endpoint, {
          movieId: id,
          title:   movie.title,
          poster:  movie.img ?? movie.poster ?? "",
          rating:  movie.rating ?? 0,
        });

        // Trust the server's reported state over our optimistic guess
        setIds((prev) => {
          const next = new Set(prev);
          data.active ? next.add(id) : next.delete(id);
          return next;
        });

        return data.active;
      } catch {
        // Request failed — undo the optimistic change
        setIds((prev) => {
          const next = new Set(prev);
          optimisticallyActive ? next.delete(id) : next.add(id);
          return next;
        });
        return !optimisticallyActive;
      } finally {
        markPending(id, false);
      }
    },
    [isLoggedIn]
  );

  const toggleLike = useCallback(
    (movie) => toggle("/api/user/likes", setLikedIds, movie),
    [toggle]
  );

  const toggleWatchlist = useCallback(
    (movie) => toggle("/api/user/watchlist", setWatchlistIds, movie),
    [toggle]
  );

  /** Removes an entry outright — used by the remove buttons on library pages. */
  const removeFrom = useCallback(async (collection, movieId) => {
    const id = String(movieId);
    const setIds = collection === "likes" ? setLikedIds : setWatchlistIds;

    setIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    try {
      await api.delete(`/api/user/${collection}/${encodeURIComponent(id)}`);
    } catch {
      // Put it back if the server rejected the delete
      setIds((prev) => new Set(prev).add(id));
    }
  }, []);

  const value = {
    likedIds,
    watchlistIds,
    loading,
    likedCount:     likedIds.size,
    watchlistCount: watchlistIds.size,
    isLiked:        (id) => likedIds.has(String(id)),
    isInWatchlist:  (id) => watchlistIds.has(String(id)),
    isPending:      (id) => pending.has(String(id)),
    toggleLike,
    toggleWatchlist,
    removeFrom,
  };

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export const useLibrary = () => {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used inside <LibraryProvider>");
  return ctx;
};
