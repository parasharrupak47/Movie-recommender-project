import { useState } from "react";
import { useLibrary } from "../context/LibraryContext.jsx";

/**
 * Recommendation card with poster, title, similarity score, and actions.
 * 
 * @param {Object} movie - Movie object with title, movie_id, poster, rating, similarity_score
 */
export default function RecommendationCard({ movie }) {
  const { isInWatchlist, isLiked, toggleWatchlist, toggleLike } = useLibrary();
  const [imageError, setImageError] = useState(false);

  const inWatchlist = isInWatchlist(movie.movie_id);
  const liked = isLiked(movie.movie_id);

  const similarityPercent = movie.similarity_score 
    ? Math.round(movie.similarity_score * 100) 
    : 0;

  const posterUrl = movie.poster && !imageError
    ? movie.poster
    : null;

  return (
    <div className="group relative bg-white/5 rounded-xl overflow-hidden hover:scale-105 hover:bg-white/8 transition-all duration-300 hover:shadow-2xl hover:shadow-violet-500/20 animate-fade-in">
      {/* Poster */}
      <div className="aspect-[3/4] bg-gradient-to-br from-violet-900/20 to-fuchsia-900/20 relative overflow-hidden">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={movie.title}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-white/20 text-4xl">🎬</span>
          </div>
        )}

        {/* Like button overlay */}
        <button
          onClick={() => toggleLike({ 
            id: movie.movie_id, 
            title: movie.title, 
            img: movie.poster, 
            rating: movie.rating 
          })}
          className="absolute top-2 right-2 w-9 h-9 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/80 transition-all hover:scale-110"
        >
          <span className={`text-lg transition-transform ${liked ? 'scale-110' : ''}`}>
            {liked ? '❤️' : '🤍'}
          </span>
        </button>

        {/* Similarity badge */}
        <div className="absolute top-2 left-2 bg-violet-600/90 backdrop-blur-sm px-2 py-1 rounded-lg">
          <span className="text-white text-xs font-bold">{similarityPercent}% Match</span>
        </div>
      </div>

      {/* Info section */}
      <div className="p-3 space-y-2">
        {/* Rating */}
        {movie.rating > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-yellow-400 text-sm">⭐</span>
            <span className="text-white/60 text-xs font-medium">{movie.rating.toFixed(1)}</span>
          </div>
        )}

        {/* Title */}
        <h3 className="text-white font-semibold text-sm line-clamp-2 leading-tight min-h-[2.5rem]">
          {movie.title}
        </h3>

        {/* Watchlist button */}
        <button
          onClick={() => toggleWatchlist({ 
            id: movie.movie_id, 
            title: movie.title, 
            img: movie.poster, 
            rating: movie.rating 
          })}
          className={`w-full py-2 rounded-lg text-xs font-medium transition-all ${
            inWatchlist
              ? 'bg-violet-600 text-white hover:bg-violet-700'
              : 'bg-white/10 text-white/80 hover:bg-white/15'
          }`}
        >
          {inWatchlist ? '✓ In Watchlist' : '+ Add to Watchlist'}
        </button>
      </div>
    </div>
  );
}
