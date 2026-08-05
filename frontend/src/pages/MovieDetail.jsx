import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api.js";
import Navbar from "../components/Navbar.jsx";
import Sidebar from "../components/Sidebar.jsx";
import MovieCard from "../components/MovieCard.jsx";
import TrailerModal from "../components/TrailerModal.jsx";
import { useLibrary } from "../context/LibraryContext.jsx";

export default function MovieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLiked, isInWatchlist, toggleLike, toggleWatchlist } = useLibrary();

  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);

  const liked = movie ? isLiked(movie.movie_id) : false;
  const inWatchlist = movie ? isInWatchlist(movie.movie_id) : false;

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    api
      .get(`/api/recommend/movie/${id}`, { signal: controller.signal })
      .then(({ data }) => {
        setMovie(data);
      })
      .catch((err) => {
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
        setError(err.response?.status === 404 ? "Movie not found" : "Failed to load movie details");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [id]);

  const formatRuntime = (minutes) => {
    if (!minutes) return "N/A";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatMoney = (amount) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] text-white flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
              <p className="text-white/50">Loading movie details...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] text-white flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <span className="text-6xl mb-4 inline-block opacity-30">😞</span>
              <h2 className="text-2xl font-bold mb-2">{error}</h2>
              <button
                onClick={() => navigate(-1)}
                className="mt-4 px-6 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors"
              >
                Go Back
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!movie) return null;

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 overflow-y-auto">
          {/* Backdrop Hero Section */}
          <div className="relative h-[60vh] min-h-[500px]">
            {/* Backdrop Image */}
            <div className="absolute inset-0">
              {movie.backdrop ? (
                <img
                  src={movie.backdrop}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-violet-900/40 to-fuchsia-900/40" />
              )}
              {/* Gradient Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0d0d0d] via-transparent to-[#0d0d0d]/80" />
            </div>

            {/* Content */}
            <div className="relative h-full max-w-7xl mx-auto px-6 flex items-end pb-12">
              <div className="flex gap-8 w-full">
                {/* Poster */}
                <div className="hidden md:block w-64 flex-shrink-0">
                  <div className="rounded-xl overflow-hidden shadow-2xl shadow-black/60 border border-white/10">
                    {movie.poster ? (
                      <img
                        src={movie.poster}
                        alt={movie.title}
                        className="w-full h-auto"
                      />
                    ) : (
                      <div className="w-full aspect-[3/4] bg-white/5 flex items-center justify-center text-6xl">
                        🎬
                      </div>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <h1 className="text-5xl font-black mb-2 bg-gradient-to-r from-white to-white/80 bg-clip-text">
                    {movie.title}
                  </h1>

                  {/* Tagline */}
                  {movie.tagline && (
                    <p className="text-xl text-violet-300 italic mb-4">{movie.tagline}</p>
                  )}

                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                      <span className="text-yellow-400 text-lg">⭐</span>
                      <span className="font-bold text-yellow-400">{movie.rating.toFixed(1)}</span>
                      <span className="text-white/40">/10</span>
                      <span className="text-white/30">({movie.voteCount.toLocaleString()} votes)</span>
                    </div>

                    {movie.releaseDate && (
                      <div className="px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-lg">
                        📅 {new Date(movie.releaseDate).getFullYear()}
                      </div>
                    )}

                    {movie.runtime > 0 && (
                      <div className="px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-lg">
                        ⏱️ {formatRuntime(movie.runtime)}
                      </div>
                    )}

                    {movie.status && (
                      <div className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-sm rounded-lg text-emerald-400">
                        {movie.status}
                      </div>
                    )}
                  </div>

                  {/* Genres */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {movie.genres.map((genre, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-violet-600/20 border border-violet-500/30 rounded-full text-sm text-violet-300"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => toggleWatchlist({
                        id: movie.movie_id,
                        title: movie.title,
                        img: movie.poster,
                        rating: movie.rating,
                      })}
                      className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                        inWatchlist
                          ? "bg-emerald-500/20 border-2 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30"
                          : "bg-violet-600 hover:bg-violet-500 border-2 border-violet-500"
                      }`}
                    >
                      {inWatchlist ? "✓ In Watchlist" : "+ Add to Watchlist"}
                    </button>

                    <button
                      onClick={() => toggleLike({
                        id: movie.movie_id,
                        title: movie.title,
                        img: movie.poster,
                        rating: movie.rating,
                      })}
                      className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 border-2 ${
                        liked
                          ? "bg-rose-500/20 border-rose-500/50 text-rose-400 hover:bg-rose-500/30"
                          : "bg-white/10 border-white/20 hover:bg-white/15"
                      }`}
                    >
                      {liked ? "❤️ Liked" : "🤍 Like"}
                    </button>

                    {movie.trailer && (
                      <button
                        onClick={() => setShowTrailer(true)}
                        className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-lg font-semibold transition-all flex items-center gap-2 border-2 border-red-500"
                      >
                        ▶️ Watch Trailer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
            {/* Overview */}
            {movie.overview && (
              <section>
                <h2 className="text-2xl font-bold mb-4">Overview</h2>
                <p className="text-white/70 text-lg leading-relaxed">{movie.overview}</p>
              </section>
            )}

            {/* Director & Stats */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {movie.director && (
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                  <div className="text-white/40 text-sm mb-2">Director</div>
                  <div className="text-xl font-semibold">{movie.director.name}</div>
                </div>
              )}

              {movie.budget > 0 && (
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                  <div className="text-white/40 text-sm mb-2">Budget</div>
                  <div className="text-xl font-semibold">{formatMoney(movie.budget)}</div>
                </div>
              )}

              {movie.revenue > 0 && (
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                  <div className="text-white/40 text-sm mb-2">Revenue</div>
                  <div className="text-xl font-semibold text-emerald-400">{formatMoney(movie.revenue)}</div>
                </div>
              )}
            </section>

            {/* Cast */}
            {movie.cast.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-6">Cast</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {movie.cast.map((actor) => (
                    <div
                      key={actor.id}
                      className="bg-white/5 backdrop-blur-sm rounded-xl overflow-hidden border border-white/10 hover:border-violet-500/50 transition-all"
                    >
                      {actor.profile ? (
                        <img
                          src={actor.profile}
                          alt={actor.name}
                          className="w-full aspect-[3/4] object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-[3/4] bg-white/5 flex items-center justify-center text-4xl">
                          👤
                        </div>
                      )}
                      <div className="p-3">
                        <div className="font-semibold text-sm truncate">{actor.name}</div>
                        <div className="text-xs text-white/40 truncate">{actor.character}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Similar Movies */}
            {movie.similar.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-6">Similar Movies</h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                  {movie.similar.map((similarMovie) => (
                    <MovieCard
                      key={similarMovie.movie_id}
                      movie={{
                        id: similarMovie.movie_id,
                        title: similarMovie.title,
                        img: similarMovie.poster,
                        rating: similarMovie.rating,
                      }}
                      onClick={(m) => navigate(`/movie/${m.id}`)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        </main>
      </div>

      {/* Trailer Modal */}
      {showTrailer && movie?.trailer && (
        <TrailerModal
          trailerUrl={movie.trailer}
          onClose={() => setShowTrailer(false)}
        />
      )}
    </div>
  );
}
