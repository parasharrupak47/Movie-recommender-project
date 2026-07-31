import { useEffect, useRef } from "react";

/**
 * Full-screen viewer for the user's profile picture.
 *
 * Presented as a circular portrait in the centre of the screen with a rotating
 * gradient halo. Dismissed by clicking the backdrop, pressing Escape, or the
 * close button. Body scroll is locked while open and focus is returned to the
 * trigger element on close.
 *
 * @param {boolean}  open     - whether the viewer is visible
 * @param {string}   src      - image URL or data URL; falsy shows initials
 * @param {string}   initials - fallback shown when there's no image
 * @param {string}   name     - display name shown under the portrait
 * @param {string}   username - handle shown under the name
 * @param {Function} onClose  - called when the viewer should close
 * @param {Function} onChange - optional; shows a "Change photo" action
 * @param {Function} onRemove - optional; shows a "Remove photo" action
 */
export default function AvatarViewer({
  open,
  src,
  initials = "M",
  name,
  username,
  onClose,
  onChange,
  onRemove,
}) {
  const closeButtonRef = useRef(null);
  const previouslyFocused = useRef(null);

  // Close on Escape, lock scroll, and manage focus while open
  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the dialog so Escape and Tab behave predictably
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Profile picture"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6
                 bg-black/85 backdrop-blur-xl animate-fade-in"
    >
      {/* Close button */}
      <button
        ref={closeButtonRef}
        onClick={onClose}
        aria-label="Close"
        className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full
                   bg-white/8 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white
                   transition-all active:scale-90
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M6 6l12 12M18 6L6 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Portrait */}
      <div className="relative animate-zoom-in">
        {/* Rotating gradient halo */}
        <div
          aria-hidden="true"
          className="absolute -inset-3 rounded-full opacity-70 blur-md animate-spin-slow
                     bg-[conic-gradient(from_0deg,#8b5cf6,#ec4899,#f59e0b,#8b5cf6)]"
        />

        {/* Static inner ring keeps the edge crisp over the blurred halo */}
        <div className="relative rounded-full p-1 bg-[#0d0d0d]">
          <div
            className="w-56 h-56 sm:w-72 sm:h-72 rounded-full overflow-hidden
                       bg-gradient-to-br from-violet-500 to-purple-700
                       flex items-center justify-center
                       ring-1 ring-white/15 shadow-2xl shadow-black/60"
          >
            {src ? (
              <img
                src={src}
                alt={name ? `${name}'s profile picture` : "Profile picture"}
                className="w-full h-full object-cover select-none"
                draggable="false"
              />
            ) : (
              <span className="text-6xl sm:text-7xl font-bold text-white select-none">
                {initials}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Identity */}
      {(name || username) && (
        <div className="mt-7 text-center animate-fade-up">
          {name && <p className="text-xl font-bold text-white">{name}</p>}
          {username && <p className="text-sm text-white/40 mt-1">@{username}</p>}
        </div>
      )}

      {/* Actions */}
      {(onChange || onRemove) && (
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3 animate-fade-up">
          {onChange && (
            <button
              onClick={onChange}
              className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold
                         px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-violet-500/25
                         active:scale-95
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              {src ? "Change photo" : "Upload photo"}
            </button>
          )}

          {onRemove && src && (
            <button
              onClick={onRemove}
              className="bg-white/5 hover:bg-red-500/15 border border-white/10 hover:border-red-500/40
                         text-white/70 hover:text-red-400 text-sm font-semibold
                         px-5 py-2.5 rounded-xl transition-all active:scale-95
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              Remove photo
            </button>
          )}
        </div>
      )}

      <p className="absolute bottom-6 text-[11px] text-white/25">
        Press Esc or click anywhere to close
      </p>
    </div>
  );
}
