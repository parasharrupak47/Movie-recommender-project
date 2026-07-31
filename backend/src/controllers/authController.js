import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { signAccessToken, signRefreshToken, setTokenCookies, verifyRefreshToken, clearTokenCookies } from "../services/tokenService.js";
import { sanitizeUser } from "../utils/sanitizeUser.js";

// ── Register ─────────────────────────────────────────────
export const register = async (req, res, next) => {
  try {
    const { username, fullName, email, password } = req.body;

    if (!username || !fullName || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    if (await User.findOne({ username }))
      return res.status(409).json({ message: "Username already taken" });

    if (await User.findOne({ email }))
      return res.status(409).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 12);
    const user   = await User.create({ username, fullName, email, password: hashed });

    const accessToken  = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);
    setTokenCookies(res, accessToken, refreshToken);

    res.status(201).json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
};

// ── Login ─────────────────────────────────────────────────
export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ message: "Username and password required" });

    const user = await User.findOne({ username: username.toLowerCase().trim() }).select("+password");
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: "Invalid credentials" });

    const accessToken  = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);
    setTokenCookies(res, accessToken, refreshToken);

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
};

// ── Refresh ───────────────────────────────────────────
export const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refresh_token;

    if (!token) {
      clearTokenCookies(res);
      return res.status(401).json({ message: "No refresh token" });
    }

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      clearTokenCookies(res);
      return res.status(401).json({ message: "User not found" });
    }

    const newAccessToken  = signAccessToken(user._id);
    const newRefreshToken = signRefreshToken(user._id);
    setTokenCookies(res, newAccessToken, newRefreshToken);

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    clearTokenCookies(res);
    res.status(401).json({ message: "Refresh token invalid or expired" });
  }
};

// ── Me (session restore) ─────────────────────────────────
// GET /api/auth/me — protected via authMiddleware
export const getMe = async (req, res) => {
  // req.user is already attached by protect middleware
  res.json({ user: sanitizeUser(req.user) });
};

// ── Logout ────────────────────────────────────────────
export const logout = (_req, res) => {
  clearTokenCookies(res);
  res.json({ message: "Logged out successfully" });
};
