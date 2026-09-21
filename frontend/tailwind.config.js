/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cloud: "#f6f7f7",
        slateink: "#35404a",
        mint: "#9adbc5",
        rose: "#dfa8b8",
        violet: "#9c8fd8"
      },
      fontFamily: {
        sans: ["Basic", "ui-sans-serif", "system-ui"],
        money: ["Spline Sans Mono", "ui-monospace", "monospace"]
      }
    }
  },
  plugins: []
};
