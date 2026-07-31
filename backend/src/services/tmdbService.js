import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG  = "https://image.tmdb.org/t/p/w500";
const API_KEY   = process.env.TMDB_API_KEY;

/**
 * Fetch poster URL for a given TMDB movie ID.
 * Returns a placeholder if the poster is missing.
 */
export const fetchPoster = async (movieId) => {
  try {
    const { data } = await axios.get(`${TMDB_BASE}/movie/${movieId}`, {
      params: { api_key: API_KEY },
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
    const { data } = await axios.get(`${TMDB_BASE}/movie/${movieId}`, {
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
  const { data } = await axios.get(`${TMDB_BASE}/search/movie`, {
    params: {
      api_key:       API_KEY,
      query,
      page,
      include_adult: false,
    },
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
  const { data } = await axios.get(`${TMDB_BASE}/trending/movie/week`, {
    params: { api_key: API_KEY },
  });
  return data.results.map((m) => ({
    movie_id: m.id,
    title:    m.title,
    poster:   m.poster_path ? `${TMDB_IMG}${m.poster_path}` : "",
    rating:   m.vote_average,
    overview: m.overview,
  }));
};
