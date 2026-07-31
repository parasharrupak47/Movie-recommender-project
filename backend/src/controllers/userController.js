import User from "../models/User.js";
import { sanitizeUser } from "../utils/sanitizeUser.js";

/**
 * Both the watchlist and likes are plain arrays of saved-movie subdocuments on
 * the User document, so every handler below shares the same logic and only
 * differs by which field it touches.
 */
const COLLECTIONS = ["watchlist", "likes"];

/** Validates the collection name so it can never be used to index an arbitrary field. */
const assertValidCollection = (name) => {
  if (!COLLECTIONS.includes(name)) throw new Error(`Invalid collection: ${name}`);
};

/**
 * Reads one saved-movie collection for the current user.
 * @param {"watchlist"|"likes"} collection
 */
const readCollection = (collection) => async (req, res, next) => {
  try {
    assertValidCollection(collection);

    const user = await User.findById(req.user.id).select(collection);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Newest first so the UI shows recent activity at the top
    const items = [...user[collection]].sort(
      (a, b) => new Date(b.addedAt) - new Date(a.addedAt)
    );

    res.json({ [collection]: items });
  } catch (err) {
    next(err);
  }
};

/**
 * Toggles a movie in one saved-movie collection.
 *
 * Toggle (rather than separate add/remove) keeps the client simple: the UI
 * fires one request per click and the server reports the resulting state,
 * which makes the operation naturally idempotent per click.
 *
 * @param {"watchlist"|"likes"} collection
 */
const toggleInCollection = (collection) => async (req, res, next) => {
  try {
    assertValidCollection(collection);

    const { movieId, title, poster = "", rating = 0 } = req.body;

    if (!movieId || !title)
      return res.status(400).json({ message: "movieId and title are required" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const id = String(movieId);
    const existingIndex = user[collection].findIndex((m) => m.movieId === id);
    const wasPresent = existingIndex !== -1;

    if (wasPresent) {
      user[collection].splice(existingIndex, 1);
    } else {
      user[collection].push({ movieId: id, title, poster, rating, addedAt: new Date() });
    }

    await user.save();

    res.json({
      movieId: id,
      active: !wasPresent,        // true → now saved, false → now removed
      count: user[collection].length,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Explicitly removes a movie from a collection, regardless of current state.
 * Used by the remove button on the Watchlist / Liked pages.
 *
 * @param {"watchlist"|"likes"} collection
 */
const removeFromCollection = (collection) => async (req, res, next) => {
  try {
    assertValidCollection(collection);

    const { movieId } = req.params;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { [collection]: { movieId: String(movieId) } } },
      { new: true }
    ).select(collection);

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ movieId, active: false, count: user[collection].length });
  } catch (err) {
    next(err);
  }
};

// ── Watchlist ────────────────────────────────────────────
export const getWatchlist        = readCollection("watchlist");
export const toggleWatchlist     = toggleInCollection("watchlist");
export const removeFromWatchlist = removeFromCollection("watchlist");

// ── Likes ────────────────────────────────────────────────
export const getLikes       = readCollection("likes");
export const toggleLike     = toggleInCollection("likes");
export const removeLike     = removeFromCollection("likes");

// ── Combined library (single request on app load) ────────
// Returns just the id lists the UI needs to paint card states immediately,
// avoiding two round-trips plus the full denormalised payload.
export const getLibrary = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("watchlist likes");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      watchlistIds: user.watchlist.map((m) => m.movieId),
      likedIds:     user.likes.map((m) => m.movieId),
    });
  } catch (err) {
    next(err);
  }
};

// ── Update profile ───────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Avatars arrive as base64 data URLs (resized client-side before upload).
// This cap keeps user documents small — roughly 300 KB of decoded image.
const MAX_AVATAR_CHARS = 400_000;

/**
 * Partially updates the current user's profile.
 *
 * Only fields present in the body are touched, so the client can send just
 * what changed. Username and email uniqueness is checked against other users
 * only, so saving an unchanged value is never treated as a conflict.
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { fullName, username, email, avatar } = req.body;
    const updates = {};

    if (fullName !== undefined) {
      const value = String(fullName).trim();
      if (!value)
        return res.status(400).json({ message: "Full name cannot be empty" });
      if (value.length > 80)
        return res.status(400).json({ message: "Full name is too long" });
      updates.fullName = value;
    }

    if (username !== undefined) {
      const value = String(username).trim().toLowerCase();
      if (!value)
        return res.status(400).json({ message: "Username cannot be empty" });
      if (!/^[a-z0-9_.]{3,20}$/.test(value))
        return res.status(400).json({
          message: "Username must be 3–20 characters, using letters, numbers, underscore or dot",
        });

      // Exclude self so re-saving the same username isn't a conflict
      const taken = await User.exists({ username: value, _id: { $ne: req.user.id } });
      if (taken)
        return res.status(409).json({ message: "Username already taken" });

      updates.username = value;
    }

    if (email !== undefined) {
      const value = String(email).trim().toLowerCase();
      if (!EMAIL_REGEX.test(value))
        return res.status(400).json({ message: "Enter a valid email address" });

      const taken = await User.exists({ email: value, _id: { $ne: req.user.id } });
      if (taken)
        return res.status(409).json({ message: "Email already registered" });

      updates.email = value;
    }

    if (avatar !== undefined) {
      const value = String(avatar);

      // Empty string is allowed — it clears the avatar back to initials
      if (value && !/^(https?:\/\/|data:image\/)/i.test(value))
        return res
          .status(400)
          .json({ message: "Avatar must be an image URL or an uploaded image" });

      if (value.length > MAX_AVATAR_CHARS)
        return res
          .status(413)
          .json({ message: "That image is too large. Please pick a smaller one." });

      updates.avatar = value;
    }

    if (Object.keys(updates).length === 0)
      return res.status(400).json({ message: "No changes provided" });

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user: sanitizeUser(user), message: "Profile updated" });
  } catch (err) {
    next(err);
  }
};

// ── Get search/recommendation history ───────────────────
export const getHistory = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("history");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ history: user.history });
  } catch (err) {
    next(err);
  }
};
