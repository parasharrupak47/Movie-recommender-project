import { Router } from "express";
import {
  getLibrary,
  getWatchlist,
  toggleWatchlist,
  removeFromWatchlist,
  getLikes,
  toggleLike,
  removeLike,
  updateProfile,
  getHistory,
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

// Every user route requires a valid access-token cookie
router.use(protect);

// GET /api/user/library — id lists for both collections, used on app load
router.get("/library", getLibrary);

// ── Watchlist ────────────────────────────────────────────
// GET    /api/user/watchlist            — full entries, newest first
// POST   /api/user/watchlist            — body: { movieId, title, poster, rating } → toggles
// DELETE /api/user/watchlist/:movieId   — explicit remove
router.get("/watchlist", getWatchlist);
router.post("/watchlist", toggleWatchlist);
router.delete("/watchlist/:movieId", removeFromWatchlist);

// ── Likes ────────────────────────────────────────────────
// GET    /api/user/likes           — full entries, newest first
// POST   /api/user/likes           — body: { movieId, title, poster, rating } → toggles
// DELETE /api/user/likes/:movieId  — explicit remove
router.get("/likes", getLikes);
router.post("/likes", toggleLike);
router.delete("/likes/:movieId", removeLike);

// ── Profile ──────────────────────────────────────────────
// PATCH /api/user/profile — body may contain any of:
//   { fullName, username, email, avatar }
router.patch("/profile", updateProfile);

// ── History ──────────────────────────────────────────────
router.get("/history", getHistory);

export default router;
