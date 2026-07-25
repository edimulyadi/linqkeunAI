import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fffdf5",
          100: "#fef7d9",
          200: "#fdedb0",
          300: "#fbdd7a",
          400: "#f8c93d",
          500: "#f0b429",
          600: "#d18f1c",
          700: "#a86b18",
          800: "#7c4f18",
          900: "#513316",
        },
        ink: {
          900: "#0b0b0c",
          800: "#151517",
          700: "#212124",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
