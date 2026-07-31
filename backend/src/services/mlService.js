import axios from "axios";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:5001";

// The matrix lookup is fast, but a cold service may still be loading artifacts
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Raised when the ML service resolves the request but has no data for it.
 * Distinguished from transport failures so the controller can map it to a 404
 * rather than a 502.
 */
export class MovieNotInDatasetError extends Error {
  constructor(message, suggestions = []) {
    super(message);
    this.name = "MovieNotInDatasetError";
    this.suggestions = suggestions;
  }
}

/** Raised when the ML service is unreachable or unhealthy. */
export class MlServiceUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = "MlServiceUnavailableError";
  }
}

/**
 * Fetches similar movies from the Python recommendation service.
 *
 * Prefer passing `movieId` — it's the TMDB id, so it matches search results
 * exactly. `title` is used as a fallback and is fuzzy-matched service-side.
 *
 * @param {{ title?: string, movieId?: number|string, topN?: number }} params
 * @returns {Promise<{matchedTitle: string, strategy: string, recommendations: Array}>}
 * @throws {MovieNotInDatasetError|MlServiceUnavailableError}
 */
export const fetchRecommendations = async ({ title, movieId, topN = 5 } = {}) => {
  if (!title && movieId === undefined)
    throw new Error("Either title or movieId is required");

  try {
    const { data } = await axios.post(
      `${ML_SERVICE_URL}/recommend`,
      { movie: title, movie_id: movieId, top_n: topN },
      { timeout: REQUEST_TIMEOUT_MS }
    );

    return {
      matchedTitle:    data.matched_title,
      strategy:        data.strategy,
      recommendations: data.recommendations ?? [],
    };
  } catch (err) {
    const status = err.response?.status;

    if (status === 404) {
      throw new MovieNotInDatasetError(
        err.response.data?.error || "Movie not found in the recommendation dataset",
        err.response.data?.suggestions ?? []
      );
    }

    if (status === 503) {
      throw new MlServiceUnavailableError(
        "The recommendation model is still loading or its data files are missing."
      );
    }

    if (err.response)
      throw new MlServiceUnavailableError(err.response.data?.error || "Recommendation service error");

    // No response at all — connection refused, DNS failure, or timeout
    throw new MlServiceUnavailableError(
      `Recommendation service is unreachable at ${ML_SERVICE_URL}. Make sure it is running.`
    );
  }
};

/** Lightweight health probe used to report model status. */
export const checkMlHealth = async () => {
  try {
    const { data } = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 3000 });
    return data;
  } catch {
    return { status: "unreachable", model_loaded: false };
  }
};
