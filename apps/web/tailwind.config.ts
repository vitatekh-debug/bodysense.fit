import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#6366F1",
          dark: "#4F46E5",
          light: "#818CF8",
        },
        surface: {
          DEFAULT: "#1E293B",
          dark: "#0F172A",
          light: "#334155",
        },
      },
    },
  },
  plugins: [],
};

export default config;
