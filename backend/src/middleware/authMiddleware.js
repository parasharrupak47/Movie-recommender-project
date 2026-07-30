import { verifyAccessToken } from "../services/tokenService.js";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  const token = req.cookies?.access_token;

  if (!token)
    return res.status(401).json({ message: "Not authorized, no token" });

  try {
    const decoded = verifyAccessToken(token);

    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user)
      return res.status(401).json({ message: "User not found" });

    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalid or expired" });
  }
};
