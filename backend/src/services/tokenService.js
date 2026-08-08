import jwt from "jsonwebtoken";

/**
 * Signs an access JWT for the given user ID.
 * @param {string} userId - The MongoDB ObjectId (as string) of the user.
 * @returns {string} Signed JWT string — expires in exactly 3 days.
 */
export function signAccessToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "3d" });
}

/**
 * Signs a refresh JWT for the given user ID.
 * @param {string} userId - The MongoDB ObjectId (as string) of the user.
 * @returns {string} Signed JWT string — expires in 7 days.
 */
export function signRefreshToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
}

/**
 * Verifies an access token and returns the decoded payload.
 * @param {string} token - The JWT string to verify.
 * @returns {{ id: string, iat: number, exp: number }} Decoded token payload.
 * @throws {import('jsonwebtoken').JsonWebTokenError | import('jsonwebtoken').TokenExpiredError}
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

/**
 * Verifies a refresh token and returns the decoded payload.
 * @param {string} token - The JWT string to verify.
 * @returns {{ id: string, iat: number, exp: number }} Decoded token payload.
 * @throws {import('jsonwebtoken').JsonWebTokenError | import('jsonwebtoken').TokenExpiredError}
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

/**
 * Sets the access_token and refresh_token httpOnly cookies on the response.
 * @param {import('express').Response} res - The Express response object.
 * @param {string} accessToken - The signed access JWT string.
 * @param {string} refreshToken - The signed refresh JWT string.
 */
export function setTokenCookies(res, accessToken, refreshToken) {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("access_token", accessToken, {
    httpOnly: true,
    sameSite: "none",
    secure: isProduction,
    maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days in ms
  });

  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    sameSite: "none",
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });
}

/**
 * Clears the access_token and refresh_token cookies from the response.
 * @param {import('express').Response} res - The Express response object.
 */
export function clearTokenCookies(res) {
  res.clearCookie("access_token");
  res.clearCookie("refresh_token");
}
