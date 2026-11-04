/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#0B0B0D",
        surface: "#141418",
        surfaceHover: "#1D1D24",
        border: "#23232A",
        brand: {
          DEFAULT: "#D7263D",
          hover: "#B51E32",
          light: "#3A1017"
        },
        textPrimary: "#F4F0EA",
        textSecondary: "#9E9EAD",
        textMuted: "#6B6B78",
        status: {
          teal: "#0D9488",
          amber: "#D97706",
          orange: "#EA580C",
          magenta: "#BE185D"
        }
      },
      fontFamily: {
        sans: [
          "Inter",
          "'Noto Sans Devanagari'",
          "'Noto Sans Malayalam'",
          "'Noto Sans Tamil'",
          "'Noto Sans Telugu'",
          "sans-serif"
        ]
      }
    }
  },
  plugins: []
}
