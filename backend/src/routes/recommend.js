import { Router } from "express";
import { getRecommendations, getTrending } from "../controllers/recommendController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

// POST /api/recommend  — body: { movie: "Inception" }
// protect middleware ensures only logged-in users can call this
router.post("/", protect, getRecommendations);

// GET /api/recommend/trending — public, pulls from TMDB
router.get("/trending", getTrending);

export default router;
