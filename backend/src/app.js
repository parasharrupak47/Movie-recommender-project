import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import recommendRoutes from "./routes/recommend.js";
import userRoutes from "./routes/user.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0);

// ── Middleware ──────────────────────────────────────────
app.use(cors({ origin: allowedOrigins, credentials: true }));
// Avatars are sent as base64 data URLs, which exceed the 100kb default.
// The profile controller enforces its own stricter per-field cap.
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// ── Routes ──────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/recommend", recommendRoutes);
app.use("/api/user", userRoutes);

// ── Health check ────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "Movie Recommender API is running" });
});

// ── Error handler (must be last) ────────────────────────
app.use(errorHandler);

export default app;
