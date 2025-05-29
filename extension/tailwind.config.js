/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./**/*.{tsx,html}",
    "./components/**/*.{tsx,html}",
    "./sidepanel.tsx",
    "./options.tsx"
  ],
  darkMode: "media",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}
