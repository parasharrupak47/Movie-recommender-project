import User from "../models/User.js";

// ── Get watchlist ────────────────────────────────────────
export const getWatchlist = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("watchlist");
    res.json({ watchlist: user.watchlist });
  } catch (err) {
    next(err);
  }
};

// ── Add to watchlist ─────────────────────────────────────
export const addToWatchlist = async (req, res, next) => {
  try {
    const { movieId, title, poster } = req.body;

    if (!movieId || !title)
      return res.status(400).json({ message: "movieId and title required" });

    const user = await User.findById(req.user.id);

    const alreadyAdded = user.watchlist.some((m) => m.movieId === movieId);
    if (alreadyAdded)
      return res.status(409).json({ message: "Movie already in watchlist" });

    user.watchlist.push({ movieId, title, poster });
    await user.save();

    res.status(201).json({ message: "Added to watchlist", watchlist: user.watchlist });
  } catch (err) {
    next(err);
  }
};

// ── Remove from watchlist ────────────────────────────────
export const removeFromWatchlist = async (req, res, next) => {
  try {
    const { movieId } = req.params;

    await User.findByIdAndUpdate(req.user.id, {
      $pull: { watchlist: { movieId } },
    });

    res.json({ message: "Removed from watchlist" });
  } catch (err) {
    next(err);
  }
};

// ── Get search/recommendation history ───────────────────
export const getHistory = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("history");
    res.json({ history: user.history });
  } catch (err) {
    next(err);
  }
};
