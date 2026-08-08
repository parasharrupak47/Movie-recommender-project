import {
  fetchRecommendations,
  checkMlHealth,
  MovieNotInDatasetError,
  MlServiceUnavailableError,
} from "../services/mlService.js";
import {
  fetchTrendingFromTMDB,
  fetchMovieBrief,
  searchMoviesOnTMDB,
  fetchMovieDetails,
} from "../services/tmdbService.js";

// ── Get full movie details from TMDB ──────────────────────
/**
 * GET /api/recommend/movie/:id
 * 
 * Fetches comprehensive movie details including cast, crew, genres, runtime, etc.
 */
export const getMovieDetails = async (req, res, next) => {
  try {
    const movieId = parseInt(req.params.id, 10);

    if (!movieId || isNaN(movieId)) {
      return res.status(400).json({ message: "Invalid movie ID" });
    }

    const details = await fetchMovieDetails(movieId);

    if (!details) {
      return res.status(404).json({ message: "Movie not found" });
    }

    res.json(details);
  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({ message: "Movie not found" });
    }
    next(err);
  }
};

// ── Get recommendations from the ML microservice ──────────
/**
 * GET  /api/recommend?movieId=27205&title=Inception&topN=5
 * POST /api/recommend    body: { movieId, movie, topN }
 *
 * `movieId` is preferred since it's the TMDB id returned by search, making the
 * join with the ML dataset exact. `title` alone still works via fuzzy matching.
 */
export const getRecommendations = async (req, res, next) => {
  try {
    // Accept either verb so the frontend can use a cacheable GET
    const source = req.method === "GET" ? req.query : req.body;

    const title = source.movie ?? source.title;
    const movieId = source.movieId ?? source.movie_id;
    const topN = Math.max(1, Math.min(20, parseInt(source.topN ?? source.top_n, 10) || 5));

    if (!title && movieId === undefined)
      return res.status(400).json({ message: "Provide either a movie title or movieId" });

    const { matchedTitle, strategy, recommendations } = await fetchRecommendations({
      title,
      movieId,
      topN,
    });

    // Enrich with poster/rating/year so the client can render cards directly.
    // Parallel because each is an independent TMDB lookup, and fetchMovieBrief
    // swallows its own failures so one bad id can't reject the batch.
    const enriched = await Promise.all(
      recommendations.map(async (rec) => {
        const brief = rec.movie_id ? await fetchMovieBrief(rec.movie_id) : {};
        return {
          movie_id:         rec.movie_id,
          title:            rec.title,
          similarity_score: rec.similarity_score,
          poster:           brief.poster ?? "",
          rating:           brief.rating ?? 0,
          year:             brief.year ?? "",
        };
      })
    );

    res.json({
      requested: title ?? null,
      matchedTitle,
      strategy,
      recommendations: enriched,
    });
  } catch (err) {
    // Movie simply isn't in the dataset snapshot — a normal outcome, not a fault
    if (err instanceof MovieNotInDatasetError)
      return res.status(404).json({ message: err.message, suggestions: err.suggestions });

    // Service down or model unloaded — upstream dependency failure
    if (err instanceof MlServiceUnavailableError)
      return res.status(503).json({ message: err.message });

    next(err);
  }
};

// ── ML service health passthrough ────────────────────────
export const getMlStatus = async (_req, res) => {
  const health = await checkMlHealth();
  res.status(health.model_loaded ? 200 : 503).json(health);
};

// ── Search movies by title ───────────────────────────────
const MIN_QUERY_LENGTH = 2;

/**
 * GET /api/recommend/search?q=inception&page=1
 *
 * Public so the landing page search works before sign-in. Returns an empty
 * result set rather than an error for short queries, which keeps the
 * debounced client from having to special-case the transition states.
 */
export const searchMovies = async (req, res, next) => {
  try {
    const query = String(req.query.q ?? "").trim();
    const page = Math.max(1, Math.min(500, parseInt(req.query.page, 10) || 1));

    // console.log(query);

    if (query.length < MIN_QUERY_LENGTH)
      return res.json({ query, results: [], page: 1, totalPages: 0, totalResults: 0 });

    const data = await searchMoviesOnTMDB(query, page);

    res.json({ query, ...data });
  } catch (err) {
    // A TMDB outage or bad key shouldn't surface as a generic 500
    if (err.response?.status === 401)
      return res.status(502).json({ message: "Movie search is misconfigured on the server" });

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
