import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { LibraryProvider } from "./context/LibraryContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Recommendation from "./pages/Recommendation.jsx";
import Watchlist from "./pages/Watchlist.jsx";
import Liked from "./pages/Liked.jsx";
import Profile from "./pages/Profile.jsx";
import SearchResults from "./pages/SearchResults.jsx";

export default function App() {
  return (
    <AuthProvider>
      {/* LibraryProvider sits inside AuthProvider because it needs the auth
          state to know when to load the user's saved movies. */}
      <LibraryProvider>
        <Router>
          <Routes>
            {/* Public routes — search works before sign-in */}
            <Route path="/"       element={<Home />} />
            <Route path="/login"  element={<Login />} />
            <Route path="/search" element={<SearchResults />} />

            {/* Protected routes — redirect to /login if not authenticated */}
            <Route
              path="/Recommendation"
              element={
                <ProtectedRoute>
                  <Recommendation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/watchlist"
              element={
                <ProtectedRoute>
                  <Watchlist />
                </ProtectedRoute>
              }
            />
            <Route
              path="/liked"
              element={
                <ProtectedRoute>
                  <Liked />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </LibraryProvider>
    </AuthProvider>
  );
}
