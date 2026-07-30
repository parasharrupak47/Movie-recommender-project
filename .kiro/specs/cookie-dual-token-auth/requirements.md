# Requirements Document

## Introduction

This feature replaces the existing single-token, Authorization-header-based authentication with a
cookie-based dual-token scheme. On successful login or registration the system issues two JWTs —
a short-lived access token and a longer-lived refresh token — and stores both in `httpOnly` cookies
so that no token ever lives in JavaScript-accessible storage. A dedicated `/api/auth/refresh`
endpoint rotates the refresh token on every use. All token logic is centralised in a new
`tokenService.js` module. The frontend `api.js` service and `AuthContext.jsx` are updated to rely
entirely on cookies, with a transparent one-attempt refresh-and-retry on 401 responses.

---

## Glossary

- **Access_Token**: A short-lived JWT (3-day expiry) used to authenticate individual API requests, stored in an `httpOnly` cookie named `access_token`.
- **Refresh_Token**: A longer-lived JWT (7-day expiry) used exclusively to obtain a new Access_Token via the refresh endpoint, stored in an `httpOnly` cookie named `refresh_token`.
- **Token_Service**: The `backend/src/services/tokenService.js` module that is the single source of truth for signing, verifying, setting, and clearing token cookies.
- **Auth_Middleware**: The `backend/src/middleware/authMiddleware.js` module that validates the Access_Token from the cookie on every protected route.
- **Auth_Controller**: The `backend/src/controllers/authController.js` module that handles register, login, refresh, logout, and me endpoints.
- **API_Service**: The `frontend/src/services/api.js` axios instance used by the frontend to communicate with the backend.
- **Auth_Context**: The `frontend/src/context/AuthContext.jsx` React context that tracks the logged-in user throughout the frontend application.
- **Rolling_Refresh**: The pattern where every successful call to the refresh endpoint invalidates the presented Refresh_Token and issues a brand-new one.
- **httpOnly_Cookie**: A browser cookie with the `httpOnly` flag set, preventing JavaScript from reading its value directly.
- **withCredentials**: The axios option that instructs the browser to attach cookies to cross-origin requests.

---

## Requirements

### Requirement 1: Token Service Module

**User Story:** As a backend developer, I want all token logic encapsulated in a single service, so that the codebase has one authoritative place to sign, verify, and manage tokens.

#### Acceptance Criteria

1. THE Token_Service SHALL export a `signAccessToken(userId)` function that returns a signed JWT with exactly a 3-day expiry, and SHALL reject any configuration that specifies a different duration.
2. THE Token_Service SHALL export a `signRefreshToken(userId)` function that returns a signed JWT with a 7-day expiry.
3. THE Token_Service SHALL export a `verifyAccessToken(token)` function that returns the decoded payload or throws when the token is invalid or expired.
4. THE Token_Service SHALL export a `verifyRefreshToken(token)` function that returns the decoded payload or throws when the token is invalid or expired.
5. THE Token_Service SHALL export a `setTokenCookies(res, accessToken, refreshToken)` function that sets both the `access_token` and `refresh_token` httpOnly cookies on the response with `httpOnly: true`, `sameSite: "strict"`, and `secure: true` when `NODE_ENV` is `"production"`.
6. THE Token_Service SHALL export a `clearTokenCookies(res)` function that clears both the `access_token` and `refresh_token` cookies from the response.
7. THE Token_Service SHALL use JSDoc comments on every exported function describing its parameters and return value.
8. THE Token_Service SHALL use `process.env.JWT_SECRET` as the signing secret for access tokens and `process.env.JWT_REFRESH_SECRET` as the signing secret for refresh tokens.

---

### Requirement 2: Cookie-Based Token Issuance on Register and Login

**User Story:** As a user, I want my session to start automatically via cookies when I register or log in, so that I never have to manage tokens in JavaScript code.

#### Acceptance Criteria

1. WHEN a user submits valid registration data, THE Auth_Controller SHALL call `Token_Service.setTokenCookies` to set both the Access_Token and Refresh_Token cookies on the response.
2. WHEN a user submits valid login credentials, THE Auth_Controller SHALL call `Token_Service.setTokenCookies` to set both the Access_Token and Refresh_Token cookies on the response.
3. WHEN registration succeeds, THE Auth_Controller SHALL return the sanitized user object in the response body without any token fields.
4. WHEN login succeeds, THE Auth_Controller SHALL return the sanitized user object in the response body without any token fields.
5. WHEN registration or login fails validation, THE Auth_Controller SHALL return an appropriate 4xx error response and SHALL NOT set any cookies.

---

### Requirement 3: Token Rotation via Refresh Endpoint

**User Story:** As a user, I want my session to be automatically renewed in the background, so that I stay logged in without needing to re-authenticate manually after 3 days.

#### Acceptance Criteria

1. WHEN a POST request is made to `/api/auth/refresh` with a valid `refresh_token` cookie, THE Auth_Controller SHALL call `Token_Service.verifyRefreshToken` to validate it.
2. WHEN the Refresh_Token is valid, THE Auth_Controller SHALL call `Token_Service.setTokenCookies` with a newly signed Access_Token and a newly signed Refresh_Token, implementing Rolling_Refresh.
3. WHEN the Refresh_Token is valid, THE Auth_Controller SHALL return a 200 response with the sanitized user object.
4. IF the `refresh_token` cookie is absent or contains an invalid token, THEN THE Auth_Controller SHALL call `Token_Service.clearTokenCookies` and return a 401 response.
5. THE Auth_Controller SHALL NOT reuse a Refresh_Token — every successful call to the refresh endpoint SHALL produce a brand-new Refresh_Token.
6. IF token generation fails after Refresh_Token validation succeeds, THEN THE Auth_Controller SHALL return a 200 response with the user data while the previously issued tokens remain active.

---

### Requirement 4: Secure Logout

**User Story:** As a user, I want logging out to fully clear my session server-side, so that my browser cookies are invalidated immediately.

#### Acceptance Criteria

1. WHEN a POST request is made to `/api/auth/logout`, THE Auth_Controller SHALL call `Token_Service.clearTokenCookies` to remove both cookies from the browser.
2. WHEN logout is called, THE Auth_Controller SHALL return a 200 response with a confirmation message.
3. THE `/api/auth/logout` route SHALL NOT require authentication — it SHALL succeed and return 200 with a confirmation message even if the Access_Token cookie is missing, expired, or no server-side session exists to clear.

---

### Requirement 5: Cookie-Reading Auth Middleware

**User Story:** As a backend developer, I want the authentication middleware to read tokens from cookies instead of the Authorization header, so that the system is consistent with the new cookie-based auth model.

#### Acceptance Criteria

1. WHEN a request arrives on a protected route, THE Auth_Middleware SHALL read the Access_Token from `req.cookies.access_token` using `cookie-parser`.
2. WHEN the `access_token` cookie is absent, THE Auth_Middleware SHALL return a 401 response with the message `"Not authorized, no token"`.
3. WHEN the `access_token` cookie contains an invalid or expired JWT, THE Auth_Middleware SHALL return a 401 response with the message `"Token invalid or expired"`.
4. WHEN the `access_token` cookie contains a valid JWT, THE Auth_Middleware SHALL attach the corresponding user (without the password field) to `req.user` and call `next()`.
5. THE `app.js` module SHALL register the `cookie-parser` middleware before any route handlers.
6. THE `cookie-parser` npm package (version `^1.4.6`) SHALL be added to `backend/package.json` as a production dependency.

---

### Requirement 6: Frontend API Service — Cookie-Based Requests with Refresh Retry

**User Story:** As a frontend developer, I want the API service to automatically handle token refresh and retry on 401 errors, so that users experience uninterrupted sessions without being abruptly logged out.

#### Acceptance Criteria

1. THE API_Service SHALL create the axios instance with `withCredentials: true` so that cookies are attached to every request.
2. THE API_Service SHALL NOT read from or write to `localStorage` for any token value.
3. THE API_Service SHALL NOT include an Authorization header on requests.
4. WHEN a response with status 401 is received, THE API_Service SHALL call `POST /api/auth/refresh` once before taking further action.
5. WHEN the refresh call succeeds, THE API_Service SHALL retry the original failed request once.
6. WHEN the refresh call fails, THE API_Service SHALL redirect the user to `/login`.
7. THE API_Service SHALL prevent refresh retry loops — a 401 response on the `/api/auth/refresh` call itself SHALL immediately redirect to `/login` without another refresh attempt.
8. WHEN the refresh call returns a network error or a non-401 server error (5xx), THE API_Service SHALL propagate the error to the caller without redirecting to `/login`.

---

### Requirement 7: Frontend Auth Context — Cookie-Driven Session

**User Story:** As a frontend developer, I want the Auth Context to establish session state purely by calling `/api/auth/me`, so that authentication state is always consistent with the server-side cookie.

#### Acceptance Criteria

1. WHEN the Auth_Context mounts, THE Auth_Context SHALL call `GET /api/auth/me` to determine whether the user has a valid session.
2. WHEN `/api/auth/me` returns successfully, THE Auth_Context SHALL set `user` and `isLoggedIn` to the returned user data and `true` respectively.
3. WHEN `/api/auth/me` returns an error, THE Auth_Context SHALL set `isLoggedIn` to `false` and `user` to `null` without attempting to access `localStorage`.
4. THE Auth_Context `login` function SHALL accept only the user data object (no token parameter) and update `user` and `isLoggedIn` state.
5. THE Auth_Context `logout` function SHALL call `POST /api/auth/logout` to clear server-side cookies and then reset `user` to `null` and `isLoggedIn` to `false`.
6. THE Auth_Context SHALL NOT read from or write to `localStorage` for any token value.
