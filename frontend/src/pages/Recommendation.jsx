import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import Navbar from "../components/Navbar.jsx";
import MovieSearchInput from "../components/MovieSearchInput.jsx";
import RecommendationCard from "../components/RecommendationCard.jsx";
import api from "../services/api.js";

export default function Home() {
  const { user } = useAuth();
  
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [matchedTitle, setMatchedTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const handleMovieSelect = (movie) => {
    setSelectedMovie(movie);
    setError(null);
    setNotFound(false);
    setRecommendations([]);
  };

  const handleGetRecommendations = async () => {
    if (!selectedMovie) return;

    setLoading(true);
    setError(null);
    setNotFound(false);
    setRecommendations([]);

    try {
      const { data } = await api.get("/api/recommend", {
        params: {
          movieId: selectedMovie.id,
          title: selectedMovie.title,
          topN: 5,
        },
      });

      setRecommendations(data.recommendations || []);
      setMatchedTitle(data.matchedTitle || selectedMovie.title);

      if (!data.recommendations || data.recommendations.length === 0) {
        setNotFound(true);
      }
    } catch (err) {
      console.error("Recommendation error:", err);

      if (err.response?.status === 404) {
        setNotFound(true);
        setError("This movie isn't in our recommendation database yet. Try another movie!");
      } else if (err.response?.status === 503) {
        setError("Recommendation service is temporarily unavailable. Please try again shortly.");
      } else {
        setError("Failed to fetch recommendations. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col">
      <Navbar />
      
      <main className="flex-1 px-6 py-12 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-5xl mb-4 inline-block">🎬</span>
          <h1 className="text-4xl font-black mb-3 bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Welcome back, {user?.fullName?.split(" ")[0] || user?.username}!
          </h1>
          <p className="text-white/50 text-base max-w-2xl mx-auto">
            Search for any movie and get personalized recommendations powered by our ML engine
          </p>
        </div>

        {/* Search Section */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-2xl">
            <label className="block text-sm font-semibold text-white/70 mb-3">
              Search for a movie
            </label>
            
            <MovieSearchInput
              onMovieSelect={handleMovieSelect}
              placeholder="Type a movie name..."
            />

            <button
              onClick={handleGetRecommendations}
              disabled={!selectedMovie || loading}
              className="w-full mt-4 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:from-white/10 disabled:to-white/10 disabled:text-white/30 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/30 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Finding similar movies...</span>
                </>
              ) : (
                <>
                  <span className="text-xl">🎯</span>
                  <span>Get Recommendations</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-3xl mx-auto mb-8">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Not Found Message */}
        {notFound && !error && (
          <div className="max-w-3xl mx-auto mb-8">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
              <p className="text-amber-400 text-sm">
                No recommendations found for this movie. Try searching for another one!
              </p>
            </div>
          </div>
        )}

        {/* Recommendations Grid */}
        {recommendations.length > 0 && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                <span>🎯</span>
                <span>Top 5 Recommendations</span>
              </h2>
              {matchedTitle && (
                <p className="text-white/40 text-sm">
                  Based on <span className="text-violet-400 font-semibold">{matchedTitle}</span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {recommendations.map((movie, index) => (
                <div
                  key={movie.movie_id || index}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <RecommendationCard movie={movie} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!selectedMovie && !loading && recommendations.length === 0 && !error && (
          <div className="max-w-3xl mx-auto text-center mt-12">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-12 border border-white/10">
              <span className="text-6xl mb-4 inline-block opacity-50">🔍</span>
              <p className="text-white/50 text-base">
                Search for a movie above to get started with personalized recommendations
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
