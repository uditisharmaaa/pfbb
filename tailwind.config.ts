import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        "property-card": "0 24px 80px rgba(5, 7, 10, 0.32)",
      },
    },
  },
  plugins: [],
};

export default config;
