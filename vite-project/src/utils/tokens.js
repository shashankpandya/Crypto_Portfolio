/**
 * JS-side mirror of the named colors in tailwind.config.js (P4-01).
 * Tailwind's arbitrary-hex classes (`text-[#EF4444]`) cover CSS-authored
 * color, but Chart.js options and SVG `stroke`/`fill` attributes take plain
 * strings, not class names — this is the one place those values live so
 * components consuming them still have zero hex literals of their own.
 */
export const COLORS = {
  coral: "#FF385C",
  cobalt: "#2563EB",
  surface: "#0b0f19",
  surfaceRaised: "#0c1118",
  base: "#050811",
  muted: "#71717a",
  positive: "#10B981",
  negative: "#EF4444",
};
