import { useState, useEffect } from "react";

/**
 * Returns a copy of `value` that only updates after it has stopped changing
 * for `delay` milliseconds.
 *
 * Used to throttle search requests: as the user types, the raw input updates
 * on every keystroke (so the field stays responsive) while the debounced value
 * — and therefore the network request — only settles once they pause. Each
 * keystroke clears the previous timer, so a fast typist triggers exactly one
 * request instead of one per character.
 *
 * @template T
 * @param {T} value        - the rapidly-changing value to debounce
 * @param {number} delay   - quiet period in milliseconds before settling
 * @returns {T} the settled value
 */
export function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);

    // Cancel the pending update whenever `value` changes again before the
    // delay elapses — this is what collapses a burst of keystrokes into one.
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default useDebounce;
