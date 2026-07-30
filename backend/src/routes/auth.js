import { Router } from "express";
import { register, login, refresh, getMe, logout } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login
router.post("/login", login);

// POST /api/auth/refresh — no auth middleware (refresh token is its own credential)
router.post("/refresh", refresh);

// GET  /api/auth/me  — protected, restores session on page refresh
router.get("/me", protect, getMe);

// POST /api/auth/logout — no auth required; must work even if access token is expired
router.post("/logout", logout);

export default router;
