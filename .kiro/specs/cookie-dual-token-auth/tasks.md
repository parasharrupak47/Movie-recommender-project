# Implementation Plan: cookie-dual-token-auth

## Overview

Migrate the existing single-token, Authorization-header-based auth to a cookie-based dual-token
scheme. A new `tokenService.js` centralises all JWT operations. The backend issues `httpOnly`
cookies on login/register, rotates tokens via a `/refresh` endpoint, and the auth middleware reads
from cookies instead of the `Authorization` header. The frontend Axios instance uses
`withCredentials`, drops all `localStorage` usage, and transparently retries once on 401 via the
refresh endpoint. `AuthContext` is simplified to cookie-driven state.

---

## Tasks

- [ ] 1. Install `cookie-parser` and add `JWT_REFRESH_SECRET` environment variable
  - Add `"cookie-parser": "^1.4.6"` to `backend/package.json` `dependencies`
  - Run `npm install` in `backend/` to update `package-lock.json`
  - Append `JWT_REFRESH_SECRET=<long-random-secret>` to `backend/.env`
  - _Requirements: 1.8, 5.5, 5.6_

- [ ] 2. Create `backend/src/services/tokenService.js`
  - [ ] 2.1 Implement `signAccessToken`, `signRefreshToken`, `verifyAccessToken`, `verifyRefreshToken`, `setTokenCookies`, and `clearTokenCookies` with JSDoc on every export
    - `signAccessToken(userId)` — signs with `JWT_SECRET`, `expiresIn: "3d"`
    - `signRefreshToken(userId)` — signs with `JWT_REFRESH_SECRET`, `expiresIn: "7d"`
    - `verifyAccessToken(token)` — verifies with `JWT_SECRET`, throws on invalid/expired
    - `verifyRefreshToken(token)` — verifies with `JWT_REFRESH_SECRET`, throws on invalid/expired
    - `setTokenCookies(res, accessToken, refreshToken)` — sets both `httpOnly`, `sameSite:"strict"`, `secure: NODE_ENV==="production"` cookies with correct `maxAge` (access: 3 days ms, refresh: 7 days ms)
    - `clearTokenCookies(res)` — calls `res.clearCookie` for `access_token` and `refresh_token`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [ ]* 2.2 Write property test — Property 1: Access Token Sign-Verify Round Trip
    - **Property 1: Access token sign-verify round trip**
    - For any valid `userId` string, `verifyAccessToken(signAccessToken(userId)).id === userId`
    - Install `fast-check` and a test runner (`jest` or `vitest`) in `backend/` dev dependencies if not already present
    - **Validates: Requirements 1.1, 1.3**

  - [ ]* 2.3 Write property test — Property 2: Refresh Token Sign-Verify Round Trip
    - **Property 2: Refresh token sign-verify round trip**
    - For any valid `userId` string, `verifyRefreshToken(signRefreshToken(userId)).id === userId`
    - **Validates: Requirements 1.2, 1.4**

  - [ ]* 2.4 Write property test — Property 3: Access Token Expiry Is Exactly 3 Days
    - **Property 3: Access token expiry is exactly 3 days**
    - For any `userId`, `exp − iat === 259200` on the decoded access token payload
    - **Validates: Requirements 1.1**

  - [ ]* 2.5 Write property test — Property 4: Refresh Token Expiry Is Exactly 7 Days
    - **Property 4: Refresh token expiry is exactly 7 days**
    - For any `userId`, `exp − iat === 604800` on the decoded refresh token payload
    - **Validates: Requirements 1.2**

  - [ ]* 2.6 Write property test — Property 5: Secret Isolation — Cross-Verification Throws
    - **Property 5: Secret isolation — cross-verification throws**
    - For any `userId`, `verifyRefreshToken(signAccessToken(userId))` throws, and `verifyAccessToken(signRefreshToken(userId))` throws
    - **Validates: Requirements 1.8**

  - [ ]* 2.7 Write property test — Property 6: Invalid Tokens Are Rejected
    - **Property 6: Invalid tokens are rejected**
    - For any tampered or structurally invalid token string, both `verifyAccessToken` and `verifyRefreshToken` throw
    - Generate tampered tokens by mutating one character of a legitimately signed token
    - **Validates: Requirements 1.3, 1.4**

- [ ] 3. Modify `backend/src/controllers/authController.js`
  - [ ] 3.1 Refactor `register` and `login` to use `tokenService`
    - Import `signAccessToken`, `signRefreshToken`, `setTokenCookies` from `tokenService.js`
    - Remove the inline `generateToken` helper
    - In `register`: call `setTokenCookies(res, accessToken, refreshToken)` and return `res.status(201).json({ user: sanitizeUser(user) })` — no `token` field in body
    - In `login`: call `setTokenCookies(res, accessToken, refreshToken)` and return `res.json({ user: sanitizeUser(user) })` — no `token` field in body
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 3.2 Add `refresh` handler and update `logout` to clear cookies
    - Import `verifyRefreshToken`, `clearTokenCookies` from `tokenService.js`
    - `refresh`: reads `req.cookies.refresh_token`; if absent or invalid calls `clearTokenCookies` and returns 401; if valid signs new tokens, calls `setTokenCookies`, returns `200 { user }`
    - `logout`: calls `clearTokenCookies(res)` then returns `200 { message: "Logged out successfully" }`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2_

  - [ ]* 3.3 Write property test — Property 7: Register/Login Response Body Contains No Token Fields
    - **Property 7: Register/login response body contains no token fields**
    - For any valid registration or login input, the response body `user` object contains only `id`, `username`, `fullName`, `email`, `avatar` and no field named `token`, `accessToken`, `refreshToken`
    - Use `supertest` with an in-memory MongoDB (e.g. `mongodb-memory-server`) or mock User/bcrypt
    - **Validates: Requirements 2.3, 2.4**

  - [ ]* 3.4 Write property test — Property 8: Failed Auth Requests Set No Cookies
    - **Property 8: Failed auth requests set no cookies**
    - For any invalid registration or login payload, the response status is 4xx and `Set-Cookie` header is absent
    - **Validates: Requirements 2.5**

  - [ ]* 3.5 Write property test — Property 9: Refresh Endpoint Issues New Tokens (Rolling Refresh)
    - **Property 9: Refresh endpoint issues new tokens (rolling refresh)**
    - After calling the refresh endpoint with a valid `refresh_token` cookie, the newly set `access_token` and `refresh_token` values differ from the originals
    - **Validates: Requirements 3.1, 3.2, 3.5**

  - [ ]* 3.6 Write property test — Property 10: Invalid Refresh Token Returns 401 and Clears Cookies
    - **Property 10: Invalid refresh token returns 401 and clears cookies**
    - For any absent, tampered, or expired `refresh_token` cookie, the endpoint returns 401 and the response includes `Set-Cookie` headers clearing both cookies
    - **Validates: Requirements 3.4**

  - [ ]* 3.7 Write property test — Property 11: Logout Always Clears Cookies and Returns 200
    - **Property 11: Logout always clears cookies and returns 200**
    - For any request state (valid token, expired token, absent token), `POST /api/auth/logout` returns 200 with confirmation message and `Set-Cookie` headers clearing both cookies
    - **Validates: Requirements 4.1, 4.2, 4.3**

- [ ] 4. Modify `backend/src/middleware/authMiddleware.js`
  - [ ] 4.1 Rewrite `protect` to read from `req.cookies.access_token` and delegate to `tokenService`
    - Import `verifyAccessToken` from `tokenService.js`
    - Replace `req.headers.authorization` extraction with `const token = req.cookies?.access_token`
    - Return `401 { message: "Not authorized, no token" }` when token is absent
    - Wrap `verifyAccessToken(token)` in try/catch; on throw return `401 { message: "Token invalid or expired" }`
    - On success, look up user by `decoded.id`, attach to `req.user` (select `-password`), call `next()`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 4.2 Write property test — Property 12: Auth Middleware Rejects All Invalid Token Variants
    - **Property 12: Auth middleware rejects all invalid token variants**
    - For any request with absent cookie, expired token, or wrong-secret token, `protect` returns 401 with the appropriate message and does NOT call `next()`
    - **Validates: Requirements 5.2, 5.3**

  - [ ]* 4.3 Write property test — Property 13: Auth Middleware Attaches User for Valid Tokens
    - **Property 13: Auth middleware attaches user for valid tokens**
    - For any `userId` corresponding to an existing user, a request carrying a valid `access_token` cookie results in `req.user` populated (no `password` field) and `next()` called
    - **Validates: Requirements 5.4**

- [ ] 5. Modify `backend/src/routes/auth.js` and `backend/src/app.js`
  - [ ] 5.1 Add `/refresh` route and remove `protect` from `/logout` in `auth.js`
    - Import `refresh` from `authController.js`
    - Add `router.post("/refresh", refresh)` — no auth middleware
    - Change `router.post("/logout", protect, logout)` to `router.post("/logout", logout)`
    - _Requirements: 3.1, 4.3_

  - [ ] 5.2 Register `cookie-parser` in `app.js` before route handlers
    - Add `import cookieParser from "cookie-parser";`
    - Add `app.use(cookieParser());` immediately after `app.use(express.json())`
    - _Requirements: 5.5_

- [ ] 6. Checkpoint — Backend wired end-to-end
  - Ensure all backend tests pass, ask the user if questions arise.

- [ ] 7. Modify `frontend/src/services/api.js`
  - [ ] 7.1 Add `withCredentials: true` and replace interceptors with cookie-aware refresh-retry logic
    - Set `withCredentials: true` on the Axios instance creation options
    - Remove the request interceptor entirely (no `localStorage` reads, no `Authorization` header)
    - Replace the response interceptor: on 401, check if the request URL includes `/api/auth/refresh`; if yes redirect to `/login`; otherwise call `POST /api/auth/refresh`, on success retry original request once (set `_retry` flag to prevent loops), on 401 from refresh redirect to `/login`, on 5xx/network error propagate without redirect
    - Remove all `localStorage.getItem` / `localStorage.removeItem` calls
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [ ]* 7.2 Write property test — Property 14: 401 Interceptor Calls Refresh Exactly Once Per Failed Request
    - **Property 14: 401 interceptor calls refresh exactly once per failed request**
    - Install `fast-check`, `vitest`, and `@testing-library/react` in `frontend/` dev dependencies if not already present; use `axios-mock-adapter` or `msw` for mocking
    - For any non-refresh endpoint returning 401, the interceptor calls `POST /api/auth/refresh` exactly once and retries the original request exactly once; a second 401 does not re-trigger refresh
    - **Validates: Requirements 6.4, 6.5**

  - [ ]* 7.3 Write property test — Property 15: Refresh Endpoint 401 Triggers Redirect Without Loop
    - **Property 15: Refresh endpoint 401 triggers redirect without loop**
    - For a 401 response from `POST /api/auth/refresh`, the interceptor redirects to `/login` immediately and makes no further calls to the refresh endpoint
    - **Validates: Requirements 6.7**

- [ ] 8. Modify `frontend/src/context/AuthContext.jsx`
  - [ ] 8.1 Remove all `localStorage` usage and simplify session initialisation
    - Remove all `localStorage.getItem("mm_token")` and `localStorage.removeItem("mm_token")` calls
    - In `useEffect` on mount: unconditionally call `GET /api/auth/me`; on success set `user` and `isLoggedIn: true`; on error set `user: null`, `isLoggedIn: false`; always call `setLoading(false)` in `.finally`
    - Change `login(token, userData)` to `login(userData)` — drop the `token` parameter; only call `setUser(userData)` and `setIsLoggedIn(true)`
    - In `logout`: call `POST /api/auth/logout` then unconditionally set `user: null`, `isLoggedIn: false` regardless of API result
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 8.2 Write property test — Property 16: Auth Context Session State Reflects /api/auth/me Response
    - **Property 16: Auth context session state reflects /api/auth/me response**
    - For any user object returned by a successful `GET /api/auth/me`, `user` state equals that object and `isLoggedIn` is `true`; for any error response, `user` is `null` and `isLoggedIn` is `false`
    - **Validates: Requirements 7.2, 7.3**

  - [ ]* 8.3 Write property test — Property 17: Logout Resets All Auth State
    - **Property 17: Logout resets all auth state**
    - For any authenticated context state, calling `logout()` always calls `POST /api/auth/logout` then sets `user` to `null` and `isLoggedIn` to `false`, regardless of whether the API call succeeds or fails
    - **Validates: Requirements 7.5**

- [ ] 9. Update call sites for the changed `login` signature
  - Search for all places in the frontend that call `login(token, userData)` (e.g. `Login.jsx`, `pages/Landing.jsx`, register form) and update them to `login(userData)`, removing the token argument
  - _Requirements: 7.4_

- [ ] 10. Final Checkpoint — Full stack integration verified
  - Ensure all tests pass (backend and frontend), ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at natural seams in the work
- Property tests use **fast-check** and validate universal correctness invariants; unit tests cover concrete examples and edge cases
- Backend test runner: add `jest` (with `--experimental-vm-modules` for ESM) or `vitest` to `backend/` dev dependencies — neither is currently present
- Frontend test runner: add `vitest` + `@testing-library/react` + `jsdom` to `frontend/` dev dependencies — neither is currently present
- `mongodb-memory-server` is recommended for controller/middleware property tests to avoid a real DB dependency
- The `_retry` flag pattern on Axios config objects prevents the response interceptor from looping on a second 401

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "3.1", "4.1"] },
    { "id": 2, "tasks": ["3.2", "3.3", "3.4", "4.2", "4.3"] },
    { "id": 3, "tasks": ["3.5", "3.6", "3.7", "5.1", "5.2"] },
    { "id": 4, "tasks": ["7.1", "8.1"] },
    { "id": 5, "tasks": ["7.2", "7.3", "8.2", "8.3", "9"] }
  ]
}
```
