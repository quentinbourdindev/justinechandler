import type { Config } from "tailwindcss";

/**
 * Design system « Alia ».
 * Palette : bleu marine #4B72A2 (primaire), rose poudré, jaune pâle, blanc/crème.
 * Typos  : Playfair Display (titres, `font-display`) + Montserrat (texte, `font-sans`),
 *          injectées en variables CSS par next/font dans le layout racine.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Bleu marine — couleur primaire de la marque (base = 500 = #4B72A2).
        navy: {
          50: "#EEF3F8",
          100: "#D6E1ED",
          200: "#AEC3DA",
          300: "#85A4C6",
          400: "#6388B4",
          500: "#4B72A2",
          600: "#3D5E86",
          700: "#324C6C",
          800: "#2A3F59",
          900: "#24344A",
        },
        // Rose poudré — accent doux, chaleureux et rassurant.
        rose: {
          50: "#FBF4F4",
          100: "#F6E7E8",
          200: "#EFD3D6",
          300: "#E4BAC0",
          400: "#D79BA4",
          500: "#C97E8B",
          600: "#B16370",
        },
        // Jaune pâle — touche lumineuse, jamais criarde.
        jaune: {
          50: "#FEFCF3",
          100: "#FBF5DF",
          200: "#F6EBC0",
          300: "#EFDD98",
          400: "#E6CB6B",
        },
        // Crème / fond clair de l'app.
        cream: "#FAF7F2",
      },
      fontFamily: {
        display: ["var(--font-display)", "Playfair Display", "serif"],
        sans: ["var(--font-sans)", "Montserrat", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        soft: "0 2px 16px -4px rgba(36, 52, 74, 0.12)",
        card: "0 1px 3px rgba(36, 52, 74, 0.08), 0 8px 24px -12px rgba(36, 52, 74, 0.16)",
      },
    },
  },
  plugins: [],
};

export default config;
