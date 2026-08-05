import { useEffect } from "react";

/**
 * Full-screen modal for playing movie trailers.
 * 
 * Features:
 * - Full-screen overlay with backdrop blur
 * - YouTube embed in 16:9 aspect ratio
 * - Click outside or press ESC to close
 * - Netflix-style fade-in animation
 * 
 * @param {string} trailerUrl - YouTube watch URL (e.g., "https://www.youtube.com/watch?v=ABC123")
 * @param {function} onClose - Callback when modal is closed
 */
export default function TrailerModal({ trailerUrl, onClose }) {
  // Extract YouTube video ID from URL
  const getYouTubeId = (url) => {
    if (!url) return null;
    
    // Handle different YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([^&]+)/,           // https://www.youtube.com/watch?v=ABC
      /(?:youtube\.com\/embed\/)([^?]+)/,             // https://www.youtube.com/embed/ABC
      /(?:youtu\.be\/)([^?]+)/,                       // https://youtu.be/ABC
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  };

  const videoId = getYouTubeId(trailerUrl);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [onClose]);

  if (!videoId) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      >
        <div className="text-center">
          <span className="text-6xl mb-4 inline-block">😞</span>
          <p className="text-white/70">Trailer not available</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      {/* Close button - top right */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 border border-white/20 hover:border-white/40 transition-all z-10 group"
        aria-label="Close trailer"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-white/70 group-hover:text-white transition-colors"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Video container - click inside doesn't close */}
      <div
        className="relative w-[90vw] max-w-6xl mx-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 16:9 aspect ratio container */}
        <div className="relative w-full pt-[56.25%] bg-black rounded-xl ovFwatcgerflow-hidden shadow-2xl shadow-black/80">
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
            title="Movie Trailer"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Instructions */}
        <p className="text-center text-white/40 text-sm mt-4">
          Press <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20">ESC</kbd> or click outside to close
        </p>
      </div>
    </div>
  );
}
