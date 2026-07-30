import { fetchRecommendations } from "../services/mlService.js";
import { fetchTrendingFromTMDB, fetchPoster } from "../services/tmdbService.js";

// ── Get recommendations from ML microservice ─────────────
export const getRecommendations = async (req, res, next) => {
  try {
    const { movie } = req.body;

    if (!movie)
      return res.status(400).json({ message: "Movie title is required" });

    // Call Python Flask ml-service
    const recommendations = await fetchRecommendations(movie);

    // Enrich each result with poster from TMDB
    const enriched = await Promise.all(
      recommendations.map(async (rec) => ({
        ...rec,
        poster: await fetchPoster(rec.movie_id),
      }))
    );

    res.json({ movie, recommendations: enriched });
  } catch (err) {
    next(err);
  }
};

// ── Get trending movies from TMDB ────────────────────────
export const getTrending = async (_req, res, next) => {
  try {
    const trending = await fetchTrendingFromTMDB();
    res.json({ trending });
  } catch (err) {
    next(err);
  }
};
