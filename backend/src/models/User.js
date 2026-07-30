import mongoose from "mongoose";

const watchlistItemSchema = new mongoose.Schema(
  {
    movieId: { type: String, required: true },
    title:   { type: String, required: true },
    poster:  { type: String, default: "" },
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
    watchlist: [watchlistItemSchema],
    history:   [historyItemSchema],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
