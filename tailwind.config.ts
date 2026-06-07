import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/data/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brasil: {
          green: "#109D49",
          yellow: "#F7D117",
          blue: "#173E9F",
          navy: "#071B4D",
          light: "#F4FFF8"
        }
      },
      boxShadow: {
        field: "0 10px 24px rgba(7, 27, 77, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
