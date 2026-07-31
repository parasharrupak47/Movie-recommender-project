import { useId } from "react";

/**
 * A single star whose golden fill is proportional to the rating.
 *
 * The fill is achieved with an SVG linearGradient: the gold stop and the
 * grey stop both sit at the same offset, creating a hard edge at exactly
 * `percentage`. This gives a precise partial fill at any ratio.
 *
 * @param {number} rating  - the movie rating, e.g. 7.4
 * @param {number} max     - the top of the rating scale (default 10)
 * @param {number} size    - pixel width/height of the star
 */
export default function StarRating({ rating = 0, max = 10, size = 16 }) {
  // useId guarantees a unique gradient id per instance so multiple
  // stars on the same page don't clobber each other's fill.
  const gradientId = `star-fill-${useId()}`;

  const safeRating = Math.max(0, Math.min(max, Number(rating) || 0));
  const percentage = (safeRating / max) * 100;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="flex-shrink-0"
      role="img"
      aria-label={`Rated ${safeRating.toFixed(1)} out of ${max}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="100%" y2="0">
          <stop offset={`${percentage}%`} stopColor="#fbbf24" />
          <stop offset={`${percentage}%`} stopColor="rgba(255,255,255,0.15)" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.3l-5.8 3.06 1.11-6.46-4.7-4.58 6.49-.94L12 2.5z"
        fill={`url(#${gradientId})`}
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="0.5"
      />
    </svg>
  );
}
