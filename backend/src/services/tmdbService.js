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
