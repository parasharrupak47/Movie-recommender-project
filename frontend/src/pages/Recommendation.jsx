import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLibrary } from "../context/LibraryContext.jsx";
import Navbar from "../components/Navbar.jsx";
import Sidebar from "../components/Sidebar.jsx";
import MovieCard from "../components/MovieCard.jsx";
import api from "../services/api.js";

export default function Recommendation() {
  const { user } = useAuth();
  const { watchlistCount, likedCount } = useLibrary();
  const navigate = useNavigate();
  
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // New state for personalized recommendations
  const [watchlistRecs, setWatchlistRecs] = useState([]);
  const [likedRecs, setLikedRecs] = useState([]);
  const [loadingWatchlistRecs, setLoadingWatchlistRecs] = useState(false);
  const [loadingLikedRecs, setLoadingLikedRecs] = useState(false);
  const [watchlistBasedOn, setWatchlistBasedOn] = useState(null);
  const [likedBasedOn, setLikedBasedOn] = useState(null);

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

  // Fetch recommendations based on watchlist
  useEffect(() => {
    if (watchlistCount === 0) return;

    const controller = new AbortController();
    setLoadingWatchlistRecs(true);

    const fetchWatchlistRecs = async () => {
      try {
        // Get watchlist movies
        const { data: watchlistData } = await api.get("/api/user/watchlist", {
          signal: controller.signal,
        });
        
        if (!watchlistData.watchlist || watchlistData.watchlist.length === 0) {
          setLoadingWatchlistRecs(false);
          return;
        }

        // Pick a random movie from watchlist
        const randomMovie = watchlistData.watchlist[
          Math.floor(Math.random() * watchlistData.watchlist.length)
        ];

        setWatchlistBasedOn(randomMovie);

        // Get recommendations for that movie
        const { data: recsData } = await api.get("/api/recommend", {
          params: {
            movieId: randomMovie.movieId,
            title: randomMovie.title,
            topN: 5,
          },
          signal: controller.signal,
        });

        setWatchlistRecs(recsData.recommendations || []);
      } catch (err) {
        if (err.name !== "CanceledError" && err.code !== "ERR_CANCELED") {
          console.error("Failed to fetch watchlist recommendations:", err);
        }
      } finally {
        if (!controller.signal.aborted) setLoadingWatchlistRecs(false);
      }
    };

    fetchWatchlistRecs();

    return () => controller.abort();
  }, [watchlistCount]);

  // Fetch recommendations based on liked movies
  useEffect(() => {
    if (likedCount === 0) return;

    const controller = new AbortController();
    setLoadingLikedRecs(true);

    const fetchLikedRecs = async () => {
      try {
        // Get liked movies
        const { data: likedData } = await api.get("/api/user/likes", {
          signal: controller.signal,
        });

        if (!likedData.likes || likedData.likes.length === 0) {
          setLoadingLikedRecs(false);
          return;
        }

        // Pick a random movie from liked
        const randomMovie = likedData.likes[
          Math.floor(Math.random() * likedData.likes.length)
        ];

        setLikedBasedOn(randomMovie);

        // Get recommendations for that movie
        const { data: recsData } = await api.get("/api/recommend", {
          params: {
            movieId: randomMovie.movieId,
            title: randomMovie.title,
            topN: 5,
          },
          signal: controller.signal,
        });

        setLikedRecs(recsData.recommendations || []);
      } catch (err) {
        if (err.name !== "CanceledError" && err.code !== "ERR_CANCELED") {
          console.error("Failed to fetch liked recommendations:", err);
        }
      } finally {
        if (!controller.signal.aborted) setLoadingLikedRecs(false);
      }
    };

    fetchLikedRecs();

    return () => controller.abort();
  }, [likedCount]);

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

          {/* Recommendations based on Watchlist */}
          {watchlistCount > 0 && (
            <section className="mt-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <span>📋</span> Based on Your Watchlist
                  </h2>
                  {watchlistBasedOn && (
                    <p className="text-sm text-white/40 mt-1">
                      Because you watchlisted <span className="text-violet-400 font-medium">{watchlistBasedOn.title}</span>
                    </p>
                  )}
                </div>
              </div>

              {loadingWatchlistRecs ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-8 gap-3">
                  {Array.from({ length: 5 }).map((_, i) => (
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
              ) : watchlistRecs.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-8 gap-3">
                  {watchlistRecs.map((movie) => (
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
              ) : (
                <div className="text-center py-8 text-white/40">
                  <p>No recommendations available for this movie</p>
                </div>
              )}
            </section>
          )}

          {/* Recommendations based on Liked Movies */}
          {likedCount > 0 && (
            <section className="mt-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <span>❤️</span> Based on Your Liked Movies
                  </h2>
                  {likedBasedOn && (
                    <p className="text-sm text-white/40 mt-1">
                      Because you liked <span className="text-rose-400 font-medium">{likedBasedOn.title}</span>
                    </p>
                  )}
                </div>
              </div>

              {loadingLikedRecs ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-8 gap-3">
                  {Array.from({ length: 5 }).map((_, i) => (
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
              ) : likedRecs.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-8 gap-3">
                  {likedRecs.map((movie) => (
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
              ) : (
                <div className="text-center py-8 text-white/40">
                  <p>No recommendations available for this movie</p>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
