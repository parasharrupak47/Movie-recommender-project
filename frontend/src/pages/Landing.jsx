import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import Navbar from "../components/Navbar.jsx";
import Sidebar from "../components/Sidebar.jsx";
import MovieCard from "../components/MovieCard.jsx";

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-400">{message}</p>;
}

function StrengthBar({ password }) {
  const score = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "bg-red-500", "bg-yellow-400", "bg-blue-400", "bg-green-400"];
  if (!password) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1 h-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`flex-1 rounded-full transition-all duration-300 ${i <= score ? colors[score] : "bg-white/10"}`} />
        ))}
      </div>
      <p className={`text-xs mt-1 ${colors[score].replace("bg-", "text-")}`}>{labels[score]}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Register Modal (unchanged logic, restyled)
// ─────────────────────────────────────────────────────────
function RegisterModal({ onClose }) {
  const navigate = useNavigate();
  const { login } = useAuth();   // ← get login from AuthContext
  const [form, setForm] = useState({ username: "", fullName: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validate = () => {
    const e = {};
    if (!form.username.trim()) e.username = "Username is required.";
    if (!form.fullName.trim()) e.fullName = "Full name is required.";
    if (!form.email.trim()) e.email = "Email is required.";
    else if (!emailRegex.test(form.email)) e.email = "Enter a valid email address.";
    if (!form.password) e.password = "Password is required.";
    else if (form.password.length < 8) e.password = "Min. 8 characters required.";
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
    setServerError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) { setErrors(fieldErrors); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/register", form);
      login(data.user);   // update AuthContext — token is now in httpOnly cookie
      navigate("/home");              // go straight to app after register
    } catch (err) {
      const msg = err.response?.data?.message || "Something went wrong.";
      if (msg.toLowerCase().includes("username")) setErrors((p) => ({ ...p, username: msg }));
      else if (msg.toLowerCase().includes("email")) setErrors((p) => ({ ...p, email: msg }));
      else setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-md bg-[#141414] border border-white/10 rounded-2xl shadow-2xl p-8">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors" aria-label="Close">✕</button>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🍹</span>
          <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">Movie Mojito</span>
        </div>
        <h2 className="text-2xl font-bold text-white mt-3 mb-1">Create account</h2>
        <p className="text-sm text-white/40 mb-6">Join free — no credit card needed.</p>

        {serverError && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">{serverError}</div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {[
            { name: "username", label: "Username", type: "text", placeholder: "e.g. mojito_fan" },
            { name: "fullName", label: "Full Name", type: "text", placeholder: "John Doe" },
            { name: "email", label: "Email", type: "email", placeholder: "you@example.com" },
          ].map(({ name, label, type, placeholder }) => (
            <div key={name}>
              <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">{label}</label>
              <input
                type={type} name={name} value={form[name]} onChange={handleChange} placeholder={placeholder}
                className={`w-full bg-white/5 border ${errors[name] ? "border-red-500/50" : "border-white/8"} rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition`}
              />
              <FieldError message={errors[name]} />
            </div>
          ))}

          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={handleChange} placeholder="Min. 8 characters"
                className={`w-full bg-white/5 border ${errors.password ? "border-red-500/50" : "border-white/8"} rounded-xl px-4 py-3 pr-14 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition`}
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 text-xs font-semibold transition">
                {showPassword ? "HIDE" : "SHOW"}
              </button>
            </div>
            <StrengthBar password={form.password} />
            <FieldError message={errors.password} />
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-violet-500/20 mt-1">
            {loading ? "Creating account…" : "Create account →"}
          </button>
        </form>

        <p className="text-center text-xs text-white/30 mt-5">
          Already have an account?{" "}
          <Link to="/login" onClick={onClose} className="text-violet-400 hover:text-violet-300 font-medium transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Mock data — replace with real API calls later
// ─────────────────────────────────────────────────────────
const TALK_OF_THE_TOWN = [
  { id: 1, title: "Avengers: Doomsday",   sub: "Official Trailer", rating: 8.7, img: "https://image.tmdb.org/t/p/w300/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg" },
  { id: 2, title: "Spider-Man: Brave",    sub: "Final Trailer",    rating: 7.9, img: "https://image.tmdb.org/t/p/w300/qhb1qOilapbapxWQn9jtRCMwXJF.jpg" },
  { id: 3, title: "Ramayana: Part One",   sub: "Teaser",           rating: 9.2, img: "https://th.bing.com/th/id/OIP.hAL1jFR2LXaJKOfz0Os9QgHaLI?w=195&h=294&c=7&r=0&o=7&dpr=1.5&pid=1.7&rm=3" },
  { id: 4, title: "Jana Nayagan",         sub: "New Movie",        rating: 6.4, img: "https://image.tmdb.org/t/p/w300/kuf6dutpsT0vSVehic3EZIqkOBt.jpg" },
  { id: 5, title: "Clayface",             sub: "Trailer",          rating: 5.8, img: "https://image.tmdb.org/t/p/w300/wTnV3PCVW5O92JMrFvvrRcV39RU.jpg" },
  { id: 6, title: "The Odyssey",          sub: "Official Trailer", rating: 8.1, img: "https://image.tmdb.org/t/p/w300/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg" },
  { id: 7, title: "Toxic",                sub: "New Movie",        rating: 7.2, img: "https://image.tmdb.org/t/p/w300/kuf6dutpsT0vSVehic3EZIqkOBt.jpg" },
  { id: 8, title: "Night Shift",          sub: "Trailer",          rating: 4.5, img: "https://image.tmdb.org/t/p/w300/wTnV3PCVW5O92JMrFvvrRcV39RU.jpg" },
];

const MOST_INTERESTED = [
  { rank: 1, title: "Avengers: Doomsday", date: "18 Dec, 2026 · In Theatre", interest: "37.6K", img: "https://image.tmdb.org/t/p/w300/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg" },
  { rank: 2, title: "Spider-Man: Brave New World", date: "30 Jul, 2026 · In Theatre", interest: "31.7K", img: "https://image.tmdb.org/t/p/w300/qhb1qOilapbapxWQn9jtRCMwXJF.jpg" },
  { rank: 3, title: "Ramayana: Part One", date: "06 Nov, 2026 · In Theatre", interest: "24K", img: "https://th.bing.com/th/id/OIP.hAL1jFR2LXaJKOfz0Os9QgHaLI?w=195&h=294&c=7&r=0&o=7&dpr=1.5&pid=1.7&rm=3" },
  { rank: 4, title: "Toxic", date: "26 Aug, 2026 · In Theatre", interest: "21.3K", img: "https://th.bing.com/th/id/OIP.f8QQ0-ikH4Tl2DrGBnPSSwHaJQ?w=137&h=180&c=7&r=0&o=7&dpr=1.5&pid=1.7&rm=3" },
  { rank: 5, title: "The Odyssey", date: "15 Oct, 2026 · In Theatre", interest: "18.9K", img: "https://i.pinimg.com/736x/6e/b5/5f/6eb55f39cad76949e32f4ebcd1a833ae.jpg" },
];

// ─────────────────────────────────────────────────────────
// Inline SVG fallback — never makes a network request
// ─────────────────────────────────────────────────────────
const FALLBACK_THUMB =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='92' height='138' viewBox='0 0 92 138'%3E%3Crect width='92' height='138' fill='%231a1a2e'/%3E%3Ctext x='46' y='74' font-size='28' text-anchor='middle' fill='%23ffffff40'%3E🎬%3C/text%3E%3C/svg%3E";

const handleImgError = (fallback) => (e) => {
  // Prevent infinite loop if the fallback itself somehow fails
  if (e.target.src !== fallback) e.target.src = fallback;
};

// ─────────────────────────────────────────────────────────
// Leaderboard row
// ─────────────────────────────────────────────────────────
function LeaderboardRow({ item }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0 hover:bg-white/3 rounded-lg px-1 transition-colors cursor-pointer group">
      {/* Rank */}
      <span className="text-3xl font-black text-white/10 group-hover:text-white/20 transition-colors w-8 text-center leading-none select-none">
        {item.rank}
      </span>
      {/* Poster */}
      <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
        <img
          src={item.img} alt={item.title}
          className="w-full h-full object-cover"
          onError={handleImgError(FALLBACK_THUMB)}
        />
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{item.title}</p>
        <p className="text-xs text-white/35 mt-0.5">{item.date}</p>
        <p className="text-xs font-semibold text-orange-400 mt-1 flex items-center gap-1">
          <span>🔥</span> {item.interest} Interested
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Main Landing Page
// ─────────────────────────────────────────────────────────
export default function Landing() {
  const [showModal, setShowModal] = useState(false);
  const { isLoggedIn, loading, user } = useAuth();
  const navigate = useNavigate();

  // Liked / watchlist state now lives in LibraryContext, backed by the database.
  // Logged-out users who tap a card action get the register prompt instead.
  const promptRegister = () => setShowModal(true);

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex overflow-hidden">

      {/* ── Left rail ─────────────────────────────────── */}
      <Sidebar />

      {/* ── Main column ───────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Top navbar ──────────────────────────────── */}
        <Navbar onRegisterClick={() => setShowModal(true)} />

        {/* ── Page body (two-column) ───────────────────── */}
        <main className="flex-1 flex overflow-hidden">

          {/* Left: main content */}
          <div className="flex-1 overflow-y-auto px-6 py-6 min-w-0"
            style={{ background: "radial-gradient(ellipse 60% 40% at 10% 0%, rgba(109,40,217,0.12) 0%, transparent 70%)" }}
          >
            {/* Hero banner */}
            <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-violet-900/30 to-transparent border border-white/5">
              <p className="text-xs text-violet-400 font-semibold uppercase tracking-widest mb-2">Welcome to Movie Mojito</p>
              <h1 className="text-3xl font-black leading-tight mb-3">
                Your personal<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400">movie compass.</span>
              </h1>
              <p className="text-sm text-white/40 max-w-md mb-5">
                Discover films tailored to your taste. ML-powered recommendations, trending charts, and a watchlist that travels with you.
              </p>
              {!loading && (
                isLoggedIn ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => navigate("/home")}
                      className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-violet-500/20"
                    >
                      Go to Home →
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowModal(true)}
                      className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-violet-500/20"
                    >
                      Register free →
                    </button>
                    <Link to="/login"
                      className="bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
                    >
                      Sign in
                    </Link>
                  </div>
                )
              )}
            </div>

            {/* Talk of the Town */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>📢</span> Talk Of The Town
                </h2>
                <button className="text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium">See all →</button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-8 gap-3">
                {TALK_OF_THE_TOWN.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    onRequireAuth={promptRegister}
                  />
                ))}
              </div>
            </section>

            {/* Trending section */}
            <section className="mt-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🔥</span> Trending This Week
                </h2>
                <button className="text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium">See all →</button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-8 gap-3">
                {TALK_OF_THE_TOWN.slice().reverse().map((movie) => {
                  // Distinct id so a movie can be toggled independently in each row
                  const trendingId = `trending-${movie.id}`;
                  return (
                    <MovieCard
                      key={trendingId}
                      movie={{ ...movie, id: trendingId }}
                      onRequireAuth={promptRegister}
                    />
                  );
                })}
              </div>
            </section>
          </div>

          {/* Right: Most Interested leaderboard */}
          <aside className="hidden xl:flex flex-col w-80 flex-shrink-0 border-l border-white/5 px-5 py-6 overflow-y-auto bg-[#0f0f0f]">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>🔥</span> Most Interested
              </h3>
              <button className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 bg-white/5 border border-white/8 rounded-full px-3 py-1 transition-colors">
                All Time <span className="text-white/30">▾</span>
              </button>
            </div>

            {/* Leaderboard list */}
            <div className="flex flex-col">
              {MOST_INTERESTED.map((item) => (
                <LeaderboardRow key={item.rank} item={item} />
              ))}
            </div>

            {/* Divider + CTA */}
            <div className="mt-auto pt-6">
              {!isLoggedIn && (
                <div className="p-4 bg-violet-600/10 border border-violet-500/20 rounded-xl">
                  <p className="text-sm font-semibold text-white mb-1">Track your watchlist</p>
                  <p className="text-xs text-white/40 mb-3">Sign up to save movies and get personalised picks.</p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="w-full bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold py-2 rounded-lg transition-all"
                  >
                    Create free account
                  </button>
                </div>
              )}
              {isLoggedIn && (
                <div className="p-4 bg-violet-600/10 border border-violet-500/20 rounded-xl">
                  <p className="text-sm font-semibold text-white mb-1">Welcome back, {user?.username}!</p>
                  <p className="text-xs text-white/40 mb-3">Head to your home feed for personalised picks.</p>
                  <button
                    onClick={() => navigate("/home")}
                    className="w-full bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold py-2 rounded-lg transition-all"
                  >
                    Go to Home →
                  </button>
                </div>
              )}
            </div>
          </aside>
        </main>
      </div>

      {/* ── Register Modal ─────────────────────────────── */}
      {showModal && <RegisterModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
