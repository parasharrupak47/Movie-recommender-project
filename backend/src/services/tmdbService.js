import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG  = "https://image.tmdb.org/t/p/w500";
const API_KEY   = process.env.TMDB_API_KEY;

// Retry configuration for TMDB API calls
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Retry wrapper for axios requests to handle ECONNRESET and network errors
 */
const axiosWithRetry = async (config, retries = MAX_RETRIES) => {
  try {
    return await axios(config);
  } catch (error) {
    const isRetryableError =
      error.code === "ECONNRESET" ||
      error.code === "ETIMEDOUT" ||
      error.code === "ENOTFOUND" ||
      error.code === "EAI_AGAIN" ||
      (error.response && error.response.status >= 500);

    if (retries > 0 && isRetryableError) {
      console.log(`[TMDB] Retrying request... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return axiosWithRetry(config, retries - 1);
    }

    throw error;
  }
};

/**
 * Fetch poster URL for a given TMDB movie ID.
 * Returns a placeholder if the poster is missing.
 */
export const fetchPoster = async (movieId) => {
  try {
    const { data } = await axiosWithRetry({
      url: `${TMDB_BASE}/movie/${movieId}`,
      params: { api_key: API_KEY },
      timeout: 8000,
    });
    return data.poster_path ? `${TMDB_IMG}${data.poster_path}` : "";
  } catch {
    return "";
  }
};

/**
 * Fetch poster, rating and release year for a TMDB movie id in a single call.
 *
 * Used to enrich ML recommendations, which come back with only titles and ids.
 * Never throws — a missing or failed lookup degrades to empty fields so one
 * bad id can't fail the whole batch.
 *
 * @param {number|string} movieId
 * @returns {Promise<{poster: string, rating: number, year: string, overview: string}>}
 */
export const fetchMovieBrief = async (movieId) => {
  try {
    const { data } = await axiosWithRetry({
      url: `${TMDB_BASE}/movie/${movieId}`,
      params: { api_key: API_KEY },
      timeout: 8000,
    });

    return {
      poster:   data.poster_path ? `${TMDB_IMG}${data.poster_path}` : "",
      rating:   data.vote_average ?? 0,
      year:     data.release_date ? data.release_date.slice(0, 4) : "",
      overview: data.overview ?? "",
    };
  } catch {
    return { poster: "", rating: 0, year: "", overview: "" };
  }
};

/**
 * Search TMDB's movie catalogue by title.
 *
 * @param {string} query - the search term
 * @param {number} page  - 1-based page number
 * @returns {Promise<{results: object[], page: number, totalPages: number, totalResults: number}>}
 */
export const searchMoviesOnTMDB = async (query, page = 1) => {
  const { data } = await axiosWithRetry({
    url: `${TMDB_BASE}/search/movie`,
    params: {
      api_key:       API_KEY,
      query,
      page,
      include_adult: false,
    },
    timeout: 10000, // 10 second timeout for search
  });

  return {
    results: data.results.map((m) => ({
      movie_id: m.id,
      title:    m.title,
      poster:   m.poster_path ? `${TMDB_IMG}${m.poster_path}` : "",
      rating:   m.vote_average ?? 0,
      year:     m.release_date ? m.release_date.slice(0, 4) : "",
      overview: m.overview ?? "",
    })),
    page:         data.page,
    totalPages:   data.total_pages,
    totalResults: data.total_results,
  };
};

/**
 * Fetch the current week's trending movies from TMDB.
 * Returns an array of movie objects.
 */
export const fetchTrendingFromTMDB = async () => {
  const { data } = await axiosWithRetry({
    url: `${TMDB_BASE}/trending/movie/week`,
    params: { api_key: API_KEY },
    timeout: 8000,
  });
  return data.results.map((m) => ({
    movie_id: m.id,
    title:    m.title,
    poster:   m.poster_path ? `${TMDB_IMG}${m.poster_path}` : "",
    rating:   m.vote_average,
    overview: m.overview,
  }));
};

/**
 * Fetch comprehensive movie details including cast, crew, genres, runtime, etc.
 * 
 * @param {number} movieId - TMDB movie ID
 * @returns {Promise<object>} Complete movie details
 */
export const fetchMovieDetails = async (movieId) => {
  const { data: movie } = await axiosWithRetry({
    url: `${TMDB_BASE}/movie/${movieId}`,
    params: {
      api_key: API_KEY,
      append_to_response: "credits,videos,similar",
    },
    timeout: 10000,
  });

  // Extract director and top cast
  const director = movie.credits?.crew?.find((c) => c.job === "Director");
  const cast = movie.credits?.cast?.slice(0, 10).map((c) => ({
    id: c.id,
    name: c.name,
    character: c.character,
    profile: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : "",
  })) || [];

  // Extract trailer
  const trailer = movie.videos?.results?.find(
    (v) => v.type === "Trailer" && v.site === "YouTube"
  );

  // Extract similar movies
  const similar = movie.similar?.results?.slice(0, 6).map((m) => ({
    movie_id: m.id,
    title: m.title,
    poster: m.poster_path ? `${TMDB_IMG}${m.poster_path}` : "",
    rating: m.vote_average ?? 0,
  })) || [];

  return {
    movie_id: movie.id,
    title: movie.title,
    tagline: movie.tagline || "",
    overview: movie.overview || "",
    poster: movie.poster_path ? `${TMDB_IMG}${movie.poster_path}` : "",
    backdrop: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : "",
    rating: movie.vote_average ?? 0,
    voteCount: movie.vote_count ?? 0,
    releaseDate: movie.release_date || "",
    runtime: movie.runtime || 0,
    budget: movie.budget || 0,
    revenue: movie.revenue || 0,
    genres: movie.genres?.map((g) => g.name) || [],
    director: director ? { name: director.name, id: director.id } : null,
    cast,
    trailer: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
    trailerKey: trailer ? trailer.key : null, // Also provide just the key for easy embedding
    similar,
    homepage: movie.homepage || "",
    status: movie.status || "",
  };
};
