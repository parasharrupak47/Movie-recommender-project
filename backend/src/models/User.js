import mongoose from "mongoose";

/**
 * Shared shape for any saved movie reference (watchlist entries and likes).
 * Stores enough denormalised data to render a card without a TMDB round-trip.
 */
const savedMovieSchema = new mongoose.Schema(
  {
    movieId: { type: String, required: true },
    title:   { type: String, required: true },
    poster:  { type: String, default: "" },
    rating:  { type: Number, default: 0 },
    addedAt: { type: Date,   default: Date.now },
  },
  { _id: false }
);

const historyItemSchema = new mongoose.Schema(
  {
    movieId:    { type: String, required: true },
    title:      { type: String, required: true },
    searchedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type:     String,
      required: [true, "Username is required"],
      unique:   true,
      trim:     true,
      lowercase: true,
    },
    fullName: {
      type:     String,
      required: [true, "Full name is required"],
      trim:     true,
    },
    email: {
      type:      String,
      required:  [true, "Email is required"],
      unique:    true,
      lowercase: true,
      trim:      true,
    },
    password: {
      type:      String,
      required:  [true, "Password is required"],
      minlength: 6,
      select:    false,   // never returned in queries by default
    },
    avatar:    { type: String, default: "" },
    watchlist: [savedMovieSchema],
    likes:     [savedMovieSchema],
    history:   [historyItemSchema],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
