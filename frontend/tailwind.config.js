/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50:  "#fff7ed",
          100: "#ffedd5",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
        },
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Modal backdrop
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        // Modal contents — settles in with a slight overshoot
        zoomIn: {
          "0%":   { opacity: "0", transform: "scale(0.85)" },
          "60%":  { opacity: "1", transform: "scale(1.02)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        // Slow halo rotation behind the avatar
        spinSlow: {
          "0%":   { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease-out both",
        "fade-up-slow": "fadeUp 0.9s ease-out 0.2s both",
        "fade-in": "fadeIn 0.2s ease-out both",
        "zoom-in": "zoomIn 0.28s cubic-bezier(0.34, 1.4, 0.64, 1) both",
        "spin-slow": "spinSlow 8s linear infinite",
      },
    },
  },
  plugins: [],
  // enable arbitrary opacity values like bg-white/3, border-white/8
  future: { hoverOnlyWhenSupported: true },
};
