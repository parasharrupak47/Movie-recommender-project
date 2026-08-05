import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Navbar from "../components/Navbar.jsx";
import Sidebar from "../components/Sidebar.jsx";
import MovieCard from "../components/MovieCard.jsx";
import api from "../services/api.js";

export default function Recommendation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    api
      .get("/api/recommend/trending", { signal: controller.signal })
      .then(({ data }) => {
        setTrending(data.trending || []);
      })
      .catch((err) => {
        if (err.name !== "CanceledError" && err.code !== "ERR_CANCELED") {
          console.error("Failed to fetch trending:", err);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        
        <main
          className="flex-1 overflow-y-auto px-6 py-6"
          style={{ background: "radial-gradient(ellipse 60% 40% at 10% 0%, rgba(109,40,217,0.1) 0%, transparent 70%)" }}
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-black mb-2">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">{user?.fullName?.split(" ")[0] || user?.username}</span>!
            </h1>
            <p className="text-white/50 text-base">
              Use the search bar above to find movies and get personalized ML-powered recommendations
            </p>
          </div>

          {/* Trending This Week */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span>🔥</span> Trending This Week
              </h2>
            </div>

            {loading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-8 gap-3">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className="rounded-xl overflow-hidden bg-white/5 animate-pulse">
                    <div className="aspect-[3/4] bg-white/5" />
                    <div className="p-2 space-y-2">
                      <div className="h-2 w-10 bg-white/10 rounded" />
                      <div className="h-2 w-full bg-white/10 rounded" />
                      <div className="h-6 w-full bg-white/10 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-8 gap-3">
                {trending.map((movie) => (
                  <MovieCard
                    key={movie.movie_id}
                    movie={{
                      id: movie.movie_id,
                      title: movie.title,
                      img: movie.poster,
                      rating: movie.rating,
                    }}
                    onClick={(m) => navigate(`/movie/${m.id}`)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Info Card - How to use */}
          <section className="mt-12">
            <div className="max-w-4xl mx-auto bg-gradient-to-br from-violet-600/20 to-fuchsia-600/10 border border-violet-500/30 rounded-2xl p-8">
              <div className="flex items-start gap-6">
                <span className="text-6xl">🎯</span>
                <div>
                  <h3 className="text-2xl font-bold mb-3">Get Personalized Recommendations</h3>
                  <p className="text-white/70 mb-4">
                    Our ML-powered recommendation engine analyzes your movie choices and suggests films you'll love.
                  </p>
                  <div className="space-y-2 text-sm text-white/60">
                    <p className="flex items-center gap-2">
                      <span className="text-violet-400">1.</span> Use the <strong className="text-white">search bar above</strong> to find any movie
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="text-violet-400">2.</span> Click on the movie poster to see full details
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="text-violet-400">3.</span> Scroll down to see <strong className="text-white">"More Like This"</strong> recommendations
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="text-violet-400">4.</span> Build your watchlist and explore similar movies!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
