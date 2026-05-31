/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0a1f44",
          50: "#eef2fb",
          800: "#0c2756",
          900: "#071736",
        },
        gold: {
          DEFAULT: "#d4a017",
          400: "#e6b733",
          600: "#b8860b",
        },
        brand: {
          blue: "#2563eb",
          cyan: "#06b6d4",
          teal: "#0d9488",
          violet: "#7c3aed",
          pink: "#db2777",
          emerald: "#059669",
        },
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
