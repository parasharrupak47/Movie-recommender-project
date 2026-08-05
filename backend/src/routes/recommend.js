import { Router } from "express";
import {
  getRecommendations,
  getTrending,
  searchMovies,
  getMlStatus,
  getMovieDetails,
} from "../controllers/recommendController.js";

const router = Router();

// GET /api/recommend/search?q=inception&page=1 — powers the search bar
router.get("/search", searchMovies);

// GET /api/recommend/trending — pulls from TMDB
router.get("/trending", getTrending);

// GET /api/recommend/status — reports whether the ML model is loaded
router.get("/status", getMlStatus);

// GET /api/recommend/movie/:id — full movie details
router.get("/movie/:id", getMovieDetails);

// GET  /api/recommend?movieId=27205&topN=5
// POST /api/recommend   body: { movieId, movie, topN }
//
// Public, matching /search. These return read-only catalogue data with nothing
// user-specific, and the recommendation row renders on the public search page.
router.get("/", getRecommendations);
router.post("/", getRecommendations);

export default router;
