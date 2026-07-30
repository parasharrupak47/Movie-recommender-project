import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,   // send cookies on every request automatically
});

// ── Response interceptor — transparent refresh-and-retry on 401 ──────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url ?? "";

    // These endpoints failing with 401 is expected — never attempt a refresh for them.
    // /api/auth/me   → unauthenticated page load (user simply isn't logged in yet)
    // /api/auth/refresh → refresh token is also expired/missing
    const isAuthEndpoint =
      requestUrl.includes("/api/auth/refresh") ||
      requestUrl.includes("/api/auth/me");

    if (error.response?.status === 401 && isAuthEndpoint) {
      // Silently propagate — callers handle the logged-out state themselves
      return Promise.reject(error);
    }

    // First 401 on any other protected endpoint → attempt a silent token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await api.post("/api/auth/refresh");
        // Server set fresh cookies — retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed — redirect to login only if not already there
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
