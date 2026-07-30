import { Router } from "express";
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  getHistory,
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

// All user routes are protected
router.use(protect);

// GET  /api/user/watchlist
router.get("/watchlist", getWatchlist);

// POST /api/user/watchlist  — body: { movieId, title, poster }
router.post("/watchlist", addToWatchlist);

// DELETE /api/user/watchlist/:movieId
router.delete("/watchlist/:movieId", removeFromWatchlist);

// GET /api/user/history
router.get("/history", getHistory);

export default router;
