/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // "Ledger Terminal" palette — a block explorer / trading-desk read on a
      // crypto portfolio, not the generic near-black-plus-one-neon-accent
      // template. `signal` is the single brand accent (phosphor-green,
      // reads as "verified / on-chain"); `ember` is the secondary warm
      // accent reserved for the logo and rare highlights, never for CTAs.
      colors: {
        signal: "#22D98A",
        ember: "#F5A524",
        coral: "#F5A524",
        cobalt: "#22D98A",
        surface: "#12151A",
        "surface-raised": "#171B21",
        base: "#0A0C0F",
        ink: "#0A0C0F",
        muted: "#7D8590",
        positive: "#22D98A",
        negative: "#FF5C5C",
      },
      fontFamily: {
        sans: ["'Space Grotesk'", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      spacing: {
        xs: "0.5rem",
        sm: "1rem",
        md: "1.5rem",
        lg: "2rem",
        xl: "3rem",
      },
      borderRadius: {
        sm: "0.375rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.5rem",
      },
      transitionDuration: {
        fast: "150ms",
        DEFAULT: "200ms",
        slow: "300ms",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      animation: {
        pulse: "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        pulse: {
          "0%, 100%": { opacity: 0.5 },
          "50%": { opacity: 0.8 },
        },
      },
    },
  },
  plugins: [],
};
