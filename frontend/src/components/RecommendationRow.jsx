import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api.js";
import MovieCard from "./MovieCard.jsx";

/**
 * Shows the top N movies the ML service considers similar to `seedMovie`.
 *
 * Renders nothing at all when the seed isn't in the model's dataset — that's a
 * normal outcome for newer releases (the similarity matrix is a fixed
 * snapshot), so an error banner would be noise rather than information.
 *
 * @param {{ movie_id: number|string, title: string }} seedMovie
 * @param {number} topN
 */
export default function RecommendationRow({ seedMovie, topN = 5 }) {
  const navigate = useNavigate();
  const [items, setItems]     = useState([]);
  const [matched, setMatched] = useState("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed]   = useState(false);
  const [offline, setOffline] = useState(false);

  const seedId    = seedMovie?.movie_id;
  const seedTitle = seedMovie?.title;

  useEffect(() => {
    if (!seedId && !seedTitle) return;

    const controller = new AbortController();

    setLoading(true);
    setFailed(false);
    setOffline(false);

    api
      .get("/api/recommend", {
        params: { movieId: seedId, movie: seedTitle, topN },
        signal: controller.signal,
      })
      .then(({ data }) => {
        setItems(data.recommendations ?? []);
        setMatched(data.matchedTitle ?? "");
      })
      .catch((err) => {
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;

        // 503 means the model service is down — worth telling the user, since
        // it's fixable. 404 just means this title isn't in the dataset.
        if (err.response?.status === 503) setOffline(true);
        setFailed(true);
        setItems([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [seedId, seedTitle, topN]);

  // Loading skeleton
  if (loading) {
    return (
      <section className="mt-10">
        <div className="h-4 w-48 bg-white/8 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {Array.from({ length: topN }).map((_, i) => (
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
      </section>
    );
  }

  // Model service unreachable — actionable, so surface it
  if (offline) {
    return (
      <section className="mt-10">
        <h2 className="text-base font-bold text-white flex items-center gap-2 mb-3">
          <span>🎯</span> More Like This
        </h2>
        <div className="px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm text-amber-400">
          The recommendation engine is offline. Start the ML service to see similar movies.
        </div>
      </section>
    );
  }

  // Not in the dataset, or no results — stay quiet
  if (failed || items.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="flex items-baseline gap-2 mb-4 flex-wrap">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <span>🎯</span> More Like This
        </h2>
        {matched && (
          <span className="text-xs text-white/35">
            based on <span className="text-violet-400 font-medium">{matched}</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {items.map((movie) => (
          <MovieCard
            key={movie.movie_id ?? movie.title}
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
    </section>
  );
}
