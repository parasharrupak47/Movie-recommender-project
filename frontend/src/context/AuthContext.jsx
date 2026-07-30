import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]             = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading]       = useState(true);

  // ── On app load: ask the server if the cookie session is still valid ──
  useEffect(() => {
    api
      .get("/api/auth/me")
      .then(({ data }) => {
        setUser(data.user);
        setIsLoggedIn(true);
      })
      .catch(() => {
        // No valid session — remain logged out
        setUser(null);
        setIsLoggedIn(false);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Called after successful login or register ─────────────
  // Token is now in an httpOnly cookie — only the user object is needed here
  const login = (userData) => {
    setUser(userData);
    setIsLoggedIn(true);
  };

  // ── Called on logout click ────────────────────────────────
  const logout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      // Server-side cookie clearing failed — clear client state regardless
    }
    setUser(null);
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Convenience hook
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
